import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { after } from "next/server";
import { cache } from "react";
import {
  MessageVisibility,
  NotificationType,
  Priority,
  Prisma,
  RoleCode,
  TicketEventType,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  canClaimTicket,
  canManageQueue,
  canViewTicket,
  hasGlobalRole,
  hasScopedRole,
} from "@/lib/access-control";
import {
  allowedNextStatuses,
  calculatePriorityFromImpactUrgency,
  canAssignTicket as canAssignWithRoles,
  canConfirmResolution,
  canPostInternalMessage,
  canReopenResolution,
  canTransitionStatus,
  isClaimableStatus,
  isStaffRole,
  makeTicketReference,
} from "@/lib/domain";
import { calculateSlaDeadlines, getTicketSlaState, SLA_RISK_WINDOW_MINUTES } from "@/lib/sla";
import { createInAppNotification, createInAppNotifications } from "@/lib/notifications";
import { appendAuditLog } from "@/lib/audit";
import {
  toAccessSubject,
  type UserContext,
  roleCodes,
  hasPermission,
  AuthorizationError,
  requireCurrentActor,
} from "@/lib/server-auth";
import {
  addMessageSchema,
  assignmentSchema,
  claimTicketSchema,
  confidentialAccessSchema,
  createTicketSchema,
  queueTransferSchema,
  slaExceptionSchema,
  ticketLinkSchema,
  ticketQualificationSchema,
  transitionTicketSchema,
  type AddMessageInput,
  type AssignmentInput,
  type ClaimTicketInput,
  type ConfidentialAccessInput,
  type CreateTicketInput,
  type QueueTransferInput,
  type SlaExceptionInput,
  type TicketLinkInput,
  type TicketQualificationInput,
  type TransitionTicketInput,
} from "@/lib/validation";
import { routeTicketFromCatalog } from "@/lib/routing";
import { measureServerOperation } from "@/lib/performance";

export class DomainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
  }
}

function isTicketCreationIdempotencyConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  return Array.isArray(target) && target.includes("creationIdempotencyToken");
}

const ticketSecurityInclude = {
  // This is the browser-safe projection used after authorization. The richer
  // ticketAccessInclude below is kept internal to the access predicate.
  requester: { select: { id: true, name: true } },
  sourceDepartment: { select: { id: true, name: true, code: true } },
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
  queue: {
    select: {
      id: true,
      name: true,
      code: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
    },
  },
  serviceCatalogItem: { select: { id: true, name: true, code: true, category: true } },
  dossier: { select: { id: true, code: true, name: true, client: { select: { id: true, code: true, name: true } } } },
  mission: { select: { id: true, code: true, name: true, status: true, dueAt: true, budgetMinutes: true } },
} as const;

async function resolveTicketProductionContext(actor: UserContext, input: CreateTicketInput) {
  if (!input.dossierId && !input.missionId) return { dossierId: null, missionId: null };
  if (!hasPermission(actor, "portfolio:read")) {
    throw new AuthorizationError("Le rattachement à un dossier ou une mission n’est pas autorisé.");
  }
  const isGlobalAdmin = hasGlobalRole(toAccessSubject(actor), RoleCode.FUNCTIONAL_ADMIN);
  const requestedMission = input.missionId ? await prisma.mission.findUnique({ where: { id: input.missionId }, include: { dossier: true } }) : null;
  if (input.missionId && !requestedMission) throw new DomainError("Mission introuvable.", 422);
  const dossierId = input.dossierId ?? requestedMission?.dossierId ?? null;
  if (input.dossierId && requestedMission && requestedMission.dossierId !== input.dossierId) {
    throw new DomainError("La mission sélectionnée n’appartient pas au dossier sélectionné.", 422);
  }
  const dossier = dossierId ? await prisma.clientDossier.findUnique({ where: { id: dossierId } }) : null;
  if (dossierId && (!dossier || !dossier.isActive)) throw new DomainError("Dossier client introuvable ou inactif.", 422);
  if (!isGlobalAdmin) {
    const departmentId = actor.departmentId ?? "__none__";
    const allowed = requestedMission
      ? requestedMission.departmentId === departmentId
      : await prisma.mission.findFirst({ where: { dossierId: dossierId ?? "__none__", departmentId } });
    if (!allowed) throw new AuthorizationError("Le dossier ou la mission est hors de votre périmètre.");
  }
  return { dossierId, missionId: requestedMission?.id ?? null };
}

const ticketAccessInclude = {
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      teamMemberships: {
        select: { teamId: true, isActive: true, team: { select: { isActive: true } } },
      },
    },
  },
  queue: {
    include: {
      department: true,
      manager: { select: { id: true, name: true } },
      teams: { select: { id: true, isActive: true } },
    },
  },
  accessList: { select: { userId: true } },
  serviceCatalogItem: { select: { id: true, code: true, category: true } },
} as const;

// A ticket remains usable even after years of activity. Bound every embedded
// timeline so opening one old ticket cannot allocate its complete history in a
// single Server Component request. Dedicated pagination can extend these
// windows without changing the authorization query.
const TICKET_MESSAGE_WINDOW = 200;
const TICKET_ASSIGNMENT_WINDOW = 100;
const TICKET_EVENT_WINDOW = 250;

type AccessTicket = {
  id?: string;
  requesterId: string;
  assignedToId: string | null;
  assignedTo?: unknown;
  queueId: string;
  confidential: boolean;
  category?: string;
  queue: {
    departmentId: string;
    teams?: { id: string; isActive: boolean }[];
  };
  accessList?: { userId: string }[];
  serviceCatalogItem?: { code?: string | null; category?: string | null } | null;
};

function accessTarget(ticket: AccessTicket) {
  const assignedTo = ticket.assignedTo as {
    teamMemberships?: { teamId: string; isActive: boolean; team: { isActive: boolean } }[];
  } | null | undefined;
  return {
    requesterId: ticket.requesterId,
    assignedToId: ticket.assignedToId,
    queueId: ticket.queueId,
    departmentId: ticket.queue.departmentId,
    confidential: ticket.confidential,
    assignedToTeamIds: assignedTo?.teamMemberships
      ?.filter((membership) => membership.isActive && membership.team.isActive)
      .map((membership) => membership.teamId),
    authorizedUserIds: ticket.accessList?.map((entry) => entry.userId) ?? [],
    teamIds: ticket.queue.teams?.filter((team) => team.isActive).map((team) => team.id),
    portfolioKeys: [
      ticket.category,
      ticket.serviceCatalogItem?.code,
      ticket.serviceCatalogItem?.category,
    ].filter((value): value is string => Boolean(value)),
  };
}

function ensureActorDepartment(actor: UserContext) {
  if (!actor.departmentId || !actor.department || !actor.department.isActive) {
    throw new DomainError("Le département applicatif validé de votre profil est manquant ou inactif.", 422);
  }
}

function isFunctionalAdministrator(actor: UserContext): boolean {
  return roleCodes(actor).includes(RoleCode.FUNCTIONAL_ADMIN);
}

function requireAdministrativeReason(actor: UserContext, reason: string | undefined) {
  if (!isFunctionalAdministrator(actor)) return;
  if (!reason || reason.trim().length < 10) {
    throw new DomainError(
      "Toute action exceptionnelle de l’administrateur fonctionnel doit comporter un motif d’au moins 10 caractères.",
      422,
    );
  }
}

async function queueWorkerIds(db: Prisma.TransactionClient | typeof prisma, queueId: string): Promise<string[]> {
  const members = await db.teamMember.findMany({
    where: {
      isActive: true,
      team: { queueId, isActive: true },
      user: {
        status: "ACTIVE",
        administrativelyDisabled: false,
        OR: [{ authorizedQueueId: null }, { authorizedQueueId: queueId }],
        roleAssignments: { some: { role: { code: RoleCode.AGENT } } },
      },
    },
    select: { userId: true },
  });
  return [...new Set(members.map((member) => member.userId))];
}

async function notifyQueueWorkers(
  db: Prisma.TransactionClient | typeof prisma,
  input: {
    queueId: string;
    managerId?: string | null;
    ticketId: string;
    type: NotificationType;
    title: string;
    body: string;
    excludeUserIds?: string[];
  },
) {
  const manager = input.managerId
    ? await db.user.findFirst({
        where: {
          id: input.managerId,
          status: "ACTIVE",
          administrativelyDisabled: false,
          OR: [{ authorizedQueueId: null }, { authorizedQueueId: input.queueId }],
          roleAssignments: {
            some: { role: { code: { in: [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] } } },
          },
        },
        select: { id: true },
      })
    : null;
  const recipients = new Set([
    manager?.id,
    ...(await queueWorkerIds(db, input.queueId)),
  ].filter(Boolean) as string[]);
  for (const recipientId of input.excludeUserIds ?? []) recipients.delete(recipientId);
  await createInAppNotifications(db, [...recipients].map((recipientId) => ({
    recipientId,
    ticketId: input.ticketId,
    type: input.type,
    title: input.title,
    body: input.body,
  })));

}

async function chooseAutoAssignee(
  db: Prisma.TransactionClient,
  queueId: string,
  requiredSkills: string[],
) {
  const members = await db.teamMember.findMany({
    where: {
      isActive: true,
      team: { queueId, isActive: true },
      user: { status: "ACTIVE", roleAssignments: { some: { role: { code: RoleCode.AGENT } } } },
    },
    select: { userId: true, isActive: true, isAvailable: true, skills: true },
  });
  if (!members.length) return null;

  const counts = await db.ticket.groupBy({
    by: ["assignedToId"],
    where: {
      queueId,
      assignedToId: { in: members.map((member) => member.userId) },
      status: { not: TicketStatus.CLOSED },
    },
    _count: { _all: true },
  });
  const countByUser = new Map(
    counts.map((entry) => [entry.assignedToId, entry._count._all]),
  );
  const normalizedSkills = requiredSkills.map((skill) => skill.toLowerCase());
  return members
    .filter((member) => {
      const skills = member.skills.map((skill) => skill.toLowerCase());
      return (
        member.isActive &&
        member.isAvailable &&
        normalizedSkills.every((skill) => skills.includes(skill))
      );
    })
    .sort(
      (left, right) =>
        (countByUser.get(left.userId) ?? 0) - (countByUser.get(right.userId) ?? 0) ||
        left.userId.localeCompare(right.userId),
    )[0] ?? null;
}

async function recordAssignment(
  tx: Prisma.TransactionClient,
  input: {
    ticketId: string;
    queueId: string;
    previousAssigneeId: string | null;
    newAssigneeId: string | null;
    assignedById: string;
    reason?: string;
    fromStatus: TicketStatus;
    toStatus: TicketStatus;
    assignmentMode: "MANUAL" | "AUTO" | "CLAIM" | "UNASSIGN" | "TRANSFER";
    actorName?: string;
    reference?: string;
  },
) {
  await tx.ticketAssignment.create({
    data: {
      ticketId: input.ticketId,
      queueId: input.queueId,
      previousAssigneeId: input.previousAssigneeId,
      newAssigneeId: input.newAssigneeId,
      assignedById: input.assignedById,
      reason: input.reason,
    },
  });
  await tx.ticketEvent.create({
    data: {
      ticketId: input.ticketId,
      actorId: input.assignedById,
      queueId: input.queueId,
      eventType: TicketEventType.ASSIGNED,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      metadata: {
        assignmentMode: input.assignmentMode,
        previousAssigneeId: input.previousAssigneeId,
        newAssigneeId: input.newAssigneeId,
      },
    },
  });
  await appendAuditLog(tx, {
    actorId: input.assignedById,
    action: input.assignmentMode === "CLAIM"
      ? "TICKET_CLAIMED"
      : input.assignmentMode === "UNASSIGN"
        ? "TICKET_UNASSIGNED"
        : input.previousAssigneeId
          ? "TICKET_REASSIGNED"
          : "TICKET_ASSIGNED",
    objectType: "Ticket",
    objectId: input.ticketId,
    oldValue: {
      assignedToId: input.previousAssigneeId,
      status: input.fromStatus,
    },
    newValue: {
      assignedToId: input.newAssigneeId,
      status: input.toStatus,
      assignmentMode: input.assignmentMode,
    },
    reason: input.reason,
  });
}

export async function createTicket(actor: UserContext, input: CreateTicketInput) {
  actor = await requireCurrentActor(actor);
  if (!hasPermission(actor, "ticket:create")) {
    throw new AuthorizationError("La permission de créer un ticket n’est pas accordée.");
  }
  ensureActorDepartment(actor);
  const parsed = createTicketSchema.parse(input);
  if (parsed.creationIdempotencyToken) {
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        createdById: actor.id,
        creationIdempotencyToken: parsed.creationIdempotencyToken,
      },
      include: ticketSecurityInclude,
    });
    if (existingTicket) return existingTicket;
  }
  const targetDepartment = parsed.targetDepartmentId
    ? await prisma.department.findFirst({ where: { id: parsed.targetDepartmentId, isActive: true }, select: { id: true, code: true, name: true } })
    : null;
  if (!parsed.serviceCatalogItemId && (!targetDepartment || !parsed.requestedService)) {
    throw new DomainError("Le besoin libre et le département cible sont obligatoires.", 422);
  }
  if (!parsed.serviceCatalogItemId && targetDepartment && targetDepartment.id !== actor.departmentId && !hasPermission(actor, "ticket:create:cross-department")) {
    throw new AuthorizationError("Vous ne pouvez pas envoyer une demande libre vers ce département.");
  }
  const service = await prisma.serviceCatalogItem.findFirst({
    where: parsed.serviceCatalogItemId
      ? { id: parsed.serviceCatalogItemId, isActive: true }
      : { code: `TRIAGE-${targetDepartment?.code}`, isActive: true, queue: { departmentId: targetDepartment?.id } },
    include: {
      queue: {
        include: {
          department: true,
          escalationRules: {
            where: { isActive: true },
            select: { id: true, thresholdPercent: true, targetRole: true },
          },
        },
      },
      sla: { include: { calendar: { include: { holidays: true } } } },
      escalationRules: {
        where: { isActive: true },
        select: { id: true, thresholdPercent: true, targetRole: true },
      },
    },
  });
  if (!service || !service.queue.isActive || !service.queue.department.isActive) {
    throw new DomainError("Le service sélectionné n’est pas disponible.", 422);
  }
  const canCreateCrossDepartment = hasPermission(
    actor,
    "ticket:create:cross-department",
  );
  if (
    service.queue.departmentId !== actor.departmentId &&
    !canCreateCrossDepartment
  ) {
    throw new AuthorizationError("Vous ne pouvez pas envoyer un ticket vers un autre département.");
  }
  if (
    actor.authorizedQueueId &&
    service.queueId !== actor.authorizedQueueId &&
    !canCreateCrossDepartment
  ) {
    throw new AuthorizationError("Ce service est routé vers une file qui ne fait pas partie de votre périmètre autorisé.");
  }
  const activeSla = service.sla;
  if (!activeSla || !activeSla.isActive || !activeSla.calendar.isActive) {
    throw new DomainError("Le service sélectionné n’a pas de SLA actif configuré.", 422);
  }

  const productionContext = await resolveTicketProductionContext(actor, parsed);

  const routing = routeTicketFromCatalog({
    serviceCatalogItemId: service.id,
    candidates: [
    {
      id: service.id,
      code: service.code,
      name: service.name,
      ticketType: parsed.type ?? service.ticketType,
      category: service.category,
      queueId: service.queueId,
      priorityDefault: service.priorityDefault,
      keywords: service.keywords,
    },
    ],
  });
  const now = new Date();
  const initialStatus = parsed.serviceCatalogItemId ? TicketStatus.NEW : TicketStatus.TO_QUALIFY;
  const escalationRules = [
    ...service.queue.escalationRules,
    ...service.escalationRules,
  ];
  const deadlines = calculateSlaDeadlines(now, activeSla, {
    ...activeSla.calendar,
    holidays: activeSla.calendar.holidays.map((holiday) => holiday.date),
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
    let ticket = await tx.ticket.create({
      data: {
        reference: makeTicketReference(now),
        title: parsed.title,
        description: parsed.description,
        requestedService: parsed.requestedService ?? null,
        confidential: parsed.confidential,
        type: routing.type,
        category: routing.category,
        priority: calculatePriorityFromImpactUrgency(parsed.impact, parsed.urgency),
        impact: parsed.impact,
        urgency: parsed.urgency,
        status: initialStatus,
        legalDueAt: parsed.legalDueAt ?? null,
        dossierId: productionContext.dossierId,
        missionId: productionContext.missionId,
        requesterId: actor.id,
        sourceDepartmentId: actor.departmentId,
        createdById: actor.id,
        creationIdempotencyToken: parsed.creationIdempotencyToken ?? null,
        queueId: routing.queueId,
        serviceCatalogItemId: routing.serviceCatalogItemId,
        slaId: activeSla.id,
        firstResponseDueAt: deadlines.firstResponseDueAt,
        resolutionDueAt: deadlines.resolutionDueAt,
        events: {
          create: {
            actorId: actor.id,
            queueId: routing.queueId,
            eventType: TicketEventType.CREATED,
            toStatus: initialStatus,
            metadata: {
              routingMode: parsed.serviceCatalogItemId ? "CATALOG" : "TRIAGE",
              requestedService: parsed.requestedService ?? null,
              matchedBy: routing.matchedBy,
              catalogItemId: service.id,
              catalogCode: service.code,
              routedDepartmentId: service.queue.departmentId,
              routedQueueId: service.queueId,
              ticketType: routing.type,
              category: routing.category,
              initialStatus,
              priority: calculatePriorityFromImpactUrgency(parsed.impact, parsed.urgency),
              impact: parsed.impact,
              urgency: parsed.urgency,
              legalDueAt: parsed.legalDueAt ?? null,
              dossierId: productionContext.dossierId,
              missionId: productionContext.missionId,
              slaId: activeSla.id,
              sourceDepartmentId: actor.departmentId,
              escalationRuleIds: escalationRules.map((rule) => rule.id),
            },
          },
        },
      },
      include: ticketSecurityInclude,
    });

    await appendAuditLog(tx, {
      actorId: actor.id,
      action: "TICKET_CREATED",
      objectType: "Ticket",
      objectId: ticket.id,
      newValue: {
        reference: ticket.reference,
        status: ticket.status,
        queueId: ticket.queue.id,
      },
    });

    let autoAssigned = false;
    let autoAssignedUserId: string | null = null;
    if (parsed.serviceCatalogItemId && service.queue.autoAssignment) {
      const candidate = await chooseAutoAssignee(tx, routing.queueId, service.keywords);
      if (candidate) {
        ticket = await tx.ticket.update({
          where: { id: ticket.id },
          data: { assignedToId: candidate.userId, status: TicketStatus.ASSIGNED },
          include: ticketSecurityInclude,
        });
        await recordAssignment(tx, {
          ticketId: ticket.id,
          queueId: routing.queueId,
          previousAssigneeId: null,
          newAssigneeId: candidate.userId,
          assignedById: actor.id,
          reason: "Auto-affectation par la file",
          fromStatus: TicketStatus.NEW,
          toStatus: TicketStatus.ASSIGNED,
          assignmentMode: "AUTO",
        });
        autoAssigned = true;
        autoAssignedUserId = candidate.userId;
      }
    }

    return {
      ticket,
      autoAssigned,
      autoAssignedUserId,
      queueId: ticket.queue.id,
      managerId: ticket.queue.managerId,
    };
  }, {
    maxWait: 10_000,
    timeout: 15_000,
  });

  after(async () => {
    try {
      await createInAppNotification(prisma, {
        recipientId: actor.id,
        ticketId: result.ticket.id,
        type: NotificationType.TICKET_CREATED,
        title: "Ticket créé",
        body: `${result.ticket.reference} a été créé et routé vers ${result.ticket.queue.name}.`,
      });

      if (result.autoAssigned && result.autoAssignedUserId) {
        await createInAppNotification(prisma, {
          recipientId: result.autoAssignedUserId,
          ticketId: result.ticket.id,
          type: NotificationType.TICKET_ASSIGNED,
          title: "Nouveau ticket affecté",
          body: `${result.ticket.reference} vous a été affecté automatiquement.`,
        });
      } else {
        await notifyQueueWorkers(prisma, {
          queueId: result.queueId,
          managerId: result.managerId,
          ticketId: result.ticket.id,
          type: NotificationType.QUEUE_NEW_TICKET,
          title: "Nouveau ticket dans votre file",
          body: `${result.ticket.reference} attend une qualification ou une prise en charge.`,
          excludeUserIds: [actor.id],
        });
      }
    } catch (notificationError) {
      console.error("Ticket créé, mais la diffusion des notifications a échoué.", notificationError);
    }
  });

    return result.ticket;
  } catch (error) {
    if (parsed.creationIdempotencyToken && isTicketCreationIdempotencyConflict(error)) {
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          createdById: actor.id,
          creationIdempotencyToken: parsed.creationIdempotencyToken,
        },
        include: ticketSecurityInclude,
      });
      if (existingTicket) return existingTicket;
    }
    throw error;
  }
}

type VisibilityOptions = {
  workQueue?: boolean;
  /** Reporting uses the same server-side scope predicates but never returns
   * ticket rows or personal/confidential records. */
  mode?: "TICKETS" | "REPORTING";
};

export type TicketListScope = "all" | "unassigned" | "mine" | "team" | "requested";
export type TicketListSlaFilter = "attention" | "breached";
export type TicketListSort = "updated_desc" | "created_desc" | "created_asc" | "status_asc";

export type TicketListOptions = VisibilityOptions & {
  status?: TicketStatus;
  priority?: Priority;
  scope?: TicketListScope;
  sla?: TicketListSlaFilter;
  departmentId?: string;
  queueId?: string;
  dossierId?: string;
  missionId?: string;
  query?: string;
  cursor?: string;
  take?: number;
  page?: number;
  pageSize?: number;
  sort?: TicketListSort;
};

function nonConfidential(clause: Prisma.TicketWhereInput): Prisma.TicketWhereInput {
  return { ...clause, confidential: false };
}

const loadActiveTeamMemberRows = cache(async (teamIdsKey: string) => {
  const teamIds = teamIdsKey.split("|").filter(Boolean);
  if (!teamIds.length) return [];
  return prisma.teamMember.findMany({
    where: {
      teamId: { in: teamIds },
      isActive: true,
      team: { isActive: true },
      user: { status: "ACTIVE" },
    },
    select: { teamId: true, userId: true },
  });
});

const MAX_FULL_TEXT_SEARCH_CANDIDATES = 5_000;

async function ticketSearchCandidateIds(query: string): Promise<string[] | null> {
  if (process.env.TICKET_FTS_ENABLED === "false") return null;
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id"
    FROM "Ticket"
    WHERE "reference" = ${normalizedQuery}
       OR search_vector @@ plainto_tsquery(
         'french',
         public.immutable_unaccent(${normalizedQuery})
       )
    ORDER BY
      CASE WHEN "reference" = ${normalizedQuery} THEN 0 ELSE 1 END,
      ts_rank(
        search_vector,
        plainto_tsquery('french', public.immutable_unaccent(${normalizedQuery}))
      ) DESC,
      "updatedAt" DESC,
      "id" DESC
    LIMIT ${MAX_FULL_TEXT_SEARCH_CANDIDATES}
  `);
  return rows.map((row) => row.id);
}

export async function visibleTicketWhere(
  actor: UserContext,
  options: VisibilityOptions = {},
): Promise<Prisma.TicketWhereInput> {
  const scopedClauses: Prisma.TicketWhereInput[] = [];
  const reportingMode = options.mode === "REPORTING";
  const relevantRoles = reportingMode
    ? new Set<RoleCode>([
        RoleCode.REPORTING_READER,
        RoleCode.QUEUE_MANAGER,
        RoleCode.FUNCTIONAL_ADMIN,
      ])
    : new Set<RoleCode>([
        RoleCode.AGENT,
        RoleCode.QUEUE_MANAGER,
        RoleCode.FUNCTIONAL_ADMIN,
      ]);
  const activeTeamMemberships = actor.teamMemberships.filter(
    (membership) => membership.isActive && membership.team.isActive,
  );
  const activeTeamQueueIds = [...new Set(activeTeamMemberships.map((membership) => membership.team.queueId))]
    .filter((queueId) => !actor.authorizedQueueId || actor.authorizedQueueId === queueId);
  const teamIdsKey = activeTeamMemberships
    .map((membership) => membership.team.id)
    .sort()
    .join("|");
  const activeTeamMemberRows = await loadActiveTeamMemberRows(teamIdsKey);
  const agentBoundaryForTeams = (
    teams: UserContext["teamMemberships"],
  ): Prisma.TicketWhereInput => {
    const teamIds = teams.map((membership) => membership.team.id);
    const queueIds = [...new Set(teams.map((membership) => membership.team.queueId))]
      .filter((queueId) => !actor.authorizedQueueId || actor.authorizedQueueId === queueId);
    const memberIds = [...new Set(
      activeTeamMemberRows
        .filter((member) => teamIds.includes(member.teamId))
        .map((member) => member.userId),
    )];
    const clauses: Prisma.TicketWhereInput[] = [];
    if (memberIds.length && queueIds.length) {
      clauses.push({ AND: [{ assignedToId: { in: memberIds } }, { queueId: { in: queueIds } }] });
    }
    if (queueIds.length) clauses.push({ AND: [{ queueId: { in: queueIds } }, { assignedToId: null }] });
    return { OR: clauses.length ? clauses : [{ id: "__no_agent_team_boundary__" }] };
  };

  for (const assignment of actor.roleAssignments) {
    if (!relevantRoles.has(assignment.role.code)) continue;
    const scope = assignment.scope;

    if (assignment.role.code === RoleCode.AGENT) {
      // Agents can work only in queues reached through an active team
      // membership. A role scope can narrow that perimeter but never widen it.
      if (!activeTeamQueueIds.length) continue;
      const agentQueueBoundary = agentBoundaryForTeams(activeTeamMemberships);
      if (!scope || scope.type === "GLOBAL") {
        scopedClauses.push(nonConfidential(agentQueueBoundary));
        continue;
      }
      switch (scope.type) {
        case "DEPARTMENT":
          if (scope.departmentId) {
            scopedClauses.push(nonConfidential({
              AND: [agentQueueBoundary, { queue: { departmentId: scope.departmentId } }],
            }));
          }
          break;
        case "QUEUE":
          if (scope.queueId && activeTeamQueueIds.includes(scope.queueId)) {
            const teams = activeTeamMemberships.filter((membership) => membership.team.queueId === scope.queueId);
            scopedClauses.push(nonConfidential(agentBoundaryForTeams(teams)));
          }
          break;
        case "TEAM": {
          const membership = activeTeamMemberships.find((item) => item.team.id === scope.teamId);
          if (membership) scopedClauses.push(nonConfidential(agentBoundaryForTeams([membership])));
          break;
        }
        case "PORTFOLIO":
          if (scope.portfolioKey) {
            scopedClauses.push(nonConfidential({
              AND: [
                agentQueueBoundary,
                { OR: [{ category: scope.portfolioKey }, { serviceCatalogItem: { code: scope.portfolioKey } }] },
              ],
            }));
          }
          break;
        case "USER_LIST":
          if (scope.members.length) {
            const userIds = scope.members.map((member) => member.userId);
            scopedClauses.push(nonConfidential({
              AND: [
                agentQueueBoundary,
                { OR: [{ requesterId: { in: userIds } }, { assignedToId: { in: userIds } }] },
              ],
            }));
          }
          break;
        default:
          break;
      }
      continue;
    }

    if (!scope || scope.type === "GLOBAL") {
      scopedClauses.push({ confidential: false });
      continue;
    }

    switch (scope.type) {
      case "DEPARTMENT":
        if (scope.departmentId) {
          scopedClauses.push(nonConfidential({ queue: { departmentId: scope.departmentId } }));
        }
        break;
      case "QUEUE":
        if (scope.queueId) scopedClauses.push(nonConfidential({ queueId: scope.queueId }));
        break;
      case "TEAM": {
        if (scope.teamId) {
          scopedClauses.push(
            nonConfidential({
              queue: { teams: { some: { id: scope.teamId, isActive: true } } },
            }),
          );
        }
        break;
      }
      case "PORTFOLIO":
        if (scope.portfolioKey) {
          scopedClauses.push(
            nonConfidential({
              OR: [
                { category: scope.portfolioKey },
                { serviceCatalogItem: { code: scope.portfolioKey } },
              ],
            }),
          );
        }
        break;
      case "USER_LIST":
        if (scope.members.length) {
          const userIds = scope.members.map((member) => member.userId);
          scopedClauses.push(
            nonConfidential({
              OR: [
                { requesterId: { in: userIds } },
                { assignedToId: { in: userIds } },
              ],
            }),
          );
        }
        break;
      default:
        break;
    }
  }

  // A queue manager explicitly attached to a queue can supervise that queue
  // even when no separate scoped role assignment was created. Reporting and
  // technical roles are deliberately excluded from this operational clause.
  const operationalQueueIds = new Set<string>(actor.managedQueues.map((queue) => queue.id));
  if (operationalQueueIds.size) {
    scopedClauses.push(
      nonConfidential({ queueId: { in: [...operationalQueueIds] } }),
    );
  }

  const personalClauses: Prisma.TicketWhereInput[] = reportingMode
    ? []
    : [
        { assignedToId: actor.id },
        { accessList: { some: { userId: actor.id } } },
      ];
  if (!reportingMode && !options.workQueue) personalClauses.unshift({ requesterId: actor.id });
  const authorizedQueueId = actor.authorizedQueueId;
  const authorizedScopedClauses = authorizedQueueId
    ? scopedClauses.map((clause) => ({
        AND: [clause, { queueId: authorizedQueueId }],
      }))
    : scopedClauses;
  if (!personalClauses.length && !authorizedScopedClauses.length) {
    return { id: "__no_visible_ticket_scope__" };
  }
  return { OR: [...personalClauses, ...authorizedScopedClauses] };
}

async function buildTicketListWhere(actor: UserContext, options: TicketListOptions) {
  const current = await requireCurrentActor(actor);
  const filters: Prisma.TicketWhereInput[] = [];
  if (options.status) filters.push({ status: options.status });
  if (options.priority) filters.push({ priority: options.priority });
  if (options.departmentId) filters.push({ queue: { departmentId: options.departmentId } });
  if (options.queueId) filters.push({ queueId: options.queueId });
  if (options.dossierId) filters.push({ dossierId: options.dossierId });
  if (options.missionId) filters.push({ missionId: options.missionId });

  switch (options.scope) {
    case "unassigned":
      filters.push({ assignedToId: null });
      break;
    case "mine":
      filters.push({ assignedToId: current.id });
      break;
    case "requested":
      filters.push({ requesterId: current.id });
      break;
    case "team": {
      const teamIds = current.teamMemberships
        .filter((membership) => membership.isActive && membership.team.isActive)
        .map((membership) => membership.team.id);
      if (!teamIds.length) {
        filters.push({ id: "__no_active_team_membership__" });
        break;
      }
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          teamId: { in: teamIds },
          isActive: true,
          user: { status: "ACTIVE" },
        },
        select: { userId: true },
      });
      const userIds = [...new Set(teamMembers.map((member) => member.userId))];
      filters.push(userIds.length ? { assignedToId: { in: userIds } } : { id: "__no_active_team_members__" });
      break;
    }
    default:
      break;
  }

  const now = new Date();
  if (options.sla) {
    const deadline = options.sla === "breached"
      ? now
      : new Date(now.getTime() + SLA_RISK_WINDOW_MINUTES * 60_000);
    filters.push({
      status: { notIn: [TicketStatus.CLOSED, TicketStatus.BLOCKED] },
      slaPausedAt: null,
      OR: [
        {
          firstResponseDueAt: { not: null, ...(options.sla === "breached" ? { lt: deadline } : { lte: deadline }) },
          firstRespondedAt: null,
        },
        {
          resolutionDueAt: { not: null, ...(options.sla === "breached" ? { lt: deadline } : { lte: deadline }) },
          resolvedAt: null,
          status: { not: TicketStatus.RESOLUTION_PENDING },
        },
      ],
    });
  }
  if (options.query) {
    const candidateIds = await ticketSearchCandidateIds(options.query);
    filters.push(candidateIds === null
      ? {
          OR: [
            { reference: { contains: options.query, mode: "insensitive" } },
            { title: { contains: options.query, mode: "insensitive" } },
            { description: { contains: options.query, mode: "insensitive" } },
          ],
        }
      : { id: { in: candidateIds.length ? candidateIds : ["__no_full_text_match__"] } });
  }
  const baseWhere = await visibleTicketWhere(current, options);
  const where: Prisma.TicketWhereInput = filters.length
    ? { AND: [baseWhere, ...filters] }
    : baseWhere;
  return { actor: current, where };
}

function ticketOrderBy(sort: TicketListSort = "updated_desc"): Prisma.TicketOrderByWithRelationInput[] {
  switch (sort) {
    case "created_desc":
      return [{ createdAt: "desc" }, { id: "desc" }];
    case "created_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }, { id: "desc" }];
    default:
      return [{ updatedAt: "desc" }, { id: "desc" }];
  }
}

type TicketListCursor = {
  id: string;
  sort: TicketListSort;
};

function encodeTicketListCursor(cursor: TicketListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeTicketListCursor(value: string, sort: TicketListSort): TicketListCursor {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<TicketListCursor>;
    if (typeof decoded.id !== "string" || !decoded.id || decoded.sort !== sort) throw new Error("invalid cursor");
    return { id: decoded.id, sort };
  } catch {
    throw new DomainError("Le curseur de pagination est invalide pour ce tri.", 400);
  }
}

const ticketListSelect = {
  id: true,
  reference: true,
  title: true,
  status: true,
  priority: true,
  requesterId: true,
  assignedToId: true,
  queueId: true,
  confidential: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  firstResponseDueAt: true,
  firstRespondedAt: true,
  resolutionDueAt: true,
  resolvedAt: true,
  slaPausedAt: true,
  totalPausedMinutes: true,
  queue: {
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      teams: { select: { id: true, isActive: true } },
    },
  },
  assignedTo: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true } },
  sourceDepartment: { select: { id: true, name: true, code: true } },
  serviceCatalogItem: { select: { name: true, code: true, category: true } },
} satisfies Prisma.TicketSelect;

export function listVisibleTicketsPage(
  actor: UserContext,
  options: TicketListOptions = {},
  settings: { includeTotal?: boolean } = {},
) {
  return measureServerOperation("tickets.list",
    () => listVisibleTicketsPageInternal(actor, options, settings.includeTotal ?? true),
  );
}

async function listVisibleTicketsPageInternal(
  actor: UserContext,
  options: TicketListOptions = {},
  includeTotal = true,
) {
  const { where } = await buildTicketListWhere(actor, options);
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? options.take ?? 25, 1), 100);
  const sort = options.sort ?? "updated_desc";
  const cursor = options.cursor ? decodeTicketListCursor(options.cursor, sort) : null;
  const now = new Date();
  const [ticketRows, exactTotal] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: ticketListSelect,
      orderBy: ticketOrderBy(sort),
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : { skip: (page - 1) * pageSize }),
      take: cursor || !includeTotal ? pageSize + 1 : pageSize,
    }),
    includeTotal ? prisma.ticket.count({ where }) : Promise.resolve(null),
  ]);
  const hasMore = exactTotal === null ? ticketRows.length > pageSize : page * pageSize < exactTotal;
  const tickets = ticketRows.slice(0, pageSize);
  const total = exactTotal ?? tickets.length;
  const mapped = tickets.map((ticket) => {
    const sla = getTicketSlaState(ticket, now);
    return { ...ticket, slaState: sla.state, slaDueAt: sla.dueAt };
  });
  return {
    tickets: mapped,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasMore,
    nextCursor: hasMore && tickets.length
      ? encodeTicketListCursor({ id: tickets.at(-1)!.id, sort })
      : null,
  };
}

export async function listVisibleTickets(actor: UserContext, options: TicketListOptions = {}) {
  return (await measureServerOperation(
    "tickets.list_without_total",
    () => listVisibleTicketsPageInternal(actor, options, false),
  )).tickets;
}

export async function getRequesterTicketSummary(actor: UserContext) {
  const current = await requireCurrentActor(actor);
  const visibleWhere = await visibleTicketWhere(current);
  const grouped = await prisma.ticket.groupBy({
    by: ["status"],
    where: { AND: [visibleWhere, { requesterId: current.id }] },
    _count: { _all: true },
  });
  return Object.fromEntries(
    Object.values(TicketStatus).map((status) => [
      status,
      grouped.find((row) => row.status === status)?._count._all ?? 0,
    ]),
  ) as Record<TicketStatus, number>;
}

export async function getOperationalTicketSummary(actor: UserContext) {
  const { actor: current, where } = await buildTicketListWhere(actor, { workQueue: true });
  const activeWhere: Prisma.TicketWhereInput = { AND: [where, { status: { not: TicketStatus.CLOSED } }] };
  const now = new Date();
  const riskDeadline = new Date(now.getTime() + SLA_RISK_WINDOW_MINUTES * 60_000);
  const slaWhere: Prisma.TicketWhereInput = {
    AND: [
      activeWhere,
      { status: { not: TicketStatus.BLOCKED }, slaPausedAt: null },
      {
        OR: [
          { firstResponseDueAt: { not: null, lte: riskDeadline }, firstRespondedAt: null },
          { resolutionDueAt: { not: null, lte: riskDeadline }, resolvedAt: null, status: { not: TicketStatus.RESOLUTION_PENDING } },
        ],
      },
    ],
  };
  const [statusCounts, assignmentCounts, slaAttention, slaBreached] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: {
        AND: [
          activeWhere,
          { OR: [{ assignedToId: null }, { assignedToId: current.id }] },
        ],
      },
      _count: { _all: true },
    }),
    prisma.ticket.count({ where: slaWhere }),
    prisma.ticket.count({ where: {
      AND: [
        activeWhere,
        { status: { not: TicketStatus.BLOCKED }, slaPausedAt: null },
        { OR: [
          { firstResponseDueAt: { not: null, lt: now }, firstRespondedAt: null },
          { resolutionDueAt: { not: null, lt: now }, resolvedAt: null, status: { not: TicketStatus.RESOLUTION_PENDING } },
        ] },
      ],
    } }),
  ]);
  const total = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const active = statusCounts
    .filter((row) => row.status !== TicketStatus.CLOSED)
    .reduce((sum, row) => sum + row._count._all, 0);
  const unassigned = assignmentCounts.find((row) => row.assignedToId === null)?._count._all ?? 0;
  const mine = assignmentCounts.find((row) => row.assignedToId === current.id)?._count._all ?? 0;
  return { total, active, unassigned, mine, slaAttention, slaBreached };
}

export function getTicketForViewer(actor: UserContext, ticketId: string) {
  return measureServerOperation("tickets.detail", () => getTicketForViewerInternal(actor, ticketId));
}

async function getTicketForViewerInternal(actor: UserContext, ticketId: string) {
  actor = await requireCurrentActor(actor);

  // Resolve only the authorization target first. Ticket content, internal
  // messages and history are fetched only after the scope check succeeds.
  const accessRecord = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!accessRecord) throw new DomainError("Ticket introuvable.", 404);

  const subject = toAccessSubject(actor);
  if (!canViewTicket(subject, accessTarget(accessRecord))) {
    throw new AuthorizationError("Vous n’avez pas accès à ce ticket.");
  }

  const canSeeInternalMessages =
    canPostInternalMessage(roleCodes(actor)) &&
    hasPermission(actor, "ticket:internal-comment", accessTarget(accessRecord));
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ...ticketSecurityInclude,
      messages: {
        ...(canSeeInternalMessages ? {} : { where: { visibility: MessageVisibility.REQUESTER } }),
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: TICKET_MESSAGE_WINDOW,
      },
      assignments: {
        include: {
          assignedBy: { select: { name: true } },
          previousAssignee: { select: { name: true } },
          newAssignee: { select: { name: true } },
        },
        orderBy: { assignedAt: "desc" },
        take: TICKET_ASSIGNMENT_WINDOW,
      },
      events: {
        ...(canSeeInternalMessages
          ? {}
          : {
              where: {
                eventType: {
                  notIn: [
                    TicketEventType.MESSAGE_ADDED,
                    TicketEventType.CONFIDENTIAL_ACCESS_GRANTED,
                    TicketEventType.CONFIDENTIAL_ACCESS_REVOKED,
                  ],
                },
              },
            }),
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: TICKET_EVENT_WINDOW,
      },
    },
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);

  // Re-check the target after the second read so a concurrent revocation or
  // reassignment cannot turn the detailed response into an unauthorized one.
  const latestAccess = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!latestAccess || !canViewTicket(subject, accessTarget(latestAccess))) {
    throw new AuthorizationError("Vous n’avez plus accès à ce ticket.");
  }

  const [worklogSummary, missionWorklogSummary] = await Promise.all([
    prisma.worklog.aggregate({
      where: { ticketId },
      _sum: { minutes: true },
      _count: { _all: true },
    }),
    ticket.missionId ? prisma.worklog.aggregate({
      where: { missionId: ticket.missionId },
      _sum: { minutes: true },
    }) : Promise.resolve({ _sum: { minutes: 0 } }),
  ]);
  // The named confidential-access list is an authorization primitive, not
  // ticket content. Never expose it to the browser.
  return {
    ...ticket,
    // The thread UI is chronological even though PostgreSQL reads the newest
    // bounded window first.
    messages: ticket.messages.toReversed(),
    worklogSummary: {
      minutes: worklogSummary._sum.minutes ?? 0,
      entries: worklogSummary._count._all,
    },
    missionWorklogMinutes: missionWorklogSummary._sum.minutes ?? 0,
  };
}

export function canActorClaimTicket(
  actor: UserContext,
  ticket: AccessTicket & { status: TicketStatus },
): boolean {
  if (actor.status !== "ACTIVE" || !isClaimableStatus(ticket.status) || ticket.assignedToId) {
    return false;
  }
  if (!roleCodes(actor).includes(RoleCode.AGENT) || !hasPermission(actor, "ticket:claim")) return false;
  const member = actor.teamMemberships.some(
    (item) =>
      item.team.queueId === ticket.queueId &&
      item.isActive &&
      item.team.isActive,
  );
  if (!member || (actor.authorizedQueueId && actor.authorizedQueueId !== ticket.queueId)) return false;
  const target = accessTarget(ticket);
  // The list/detail caller has already applied the row-level visibility
  // predicate. The mutation route repeats the full confidential check; this
  // UI hint must not be used as an authorization decision.
  return canClaimTicket(toAccessSubject(actor), target);
}

export async function getTicketActionContext(actor: UserContext, ticket: AccessTicket & { status: TicketStatus }) {
  actor = await requireCurrentActor(actor);
  const authorizationTicket = ticket.id
    ? await prisma.ticket.findUnique({ where: { id: ticket.id }, include: ticketAccessInclude })
    : ticket;
  if (!authorizationTicket) throw new DomainError("Ticket introuvable.", 404);
  const authorizationList = authorizationTicket.accessList?.length
    ? authorizationTicket.accessList
    : ticket.accessList ?? [];
  const subject = toAccessSubject(actor);
  const target = accessTarget({ ...authorizationTicket, accessList: authorizationList });
  if (!canViewTicket(subject, target)) {
    throw new AuthorizationError("Vous n’avez pas accès aux actions de ce ticket.");
  }
  const canAssign = hasPermission(actor, "ticket:assign", target) && canAssignWithRoles(roleCodes(actor)) && canManageQueue(subject, target);
  const canTransfer = hasPermission(actor, "ticket:transfer", target) && canManageQueue(subject, target);
  const canPostPublic =
    hasPermission(actor, "ticket:comment:public", target) ||
    hasPermission(actor, "ticket:update", target);
  const requesterAction = actor.id === ticket.requesterId;
  let allowedStatuses = allowedNextStatuses(ticket.status, roleCodes(actor), requesterAction);
  if (!ticket.assignedToId) {
    allowedStatuses = allowedStatuses.filter(
      (status) =>
        status !== TicketStatus.IN_PROGRESS &&
        status !== TicketStatus.BLOCKED &&
        status !== TicketStatus.RESOLUTION_PENDING,
    );
  }

  const agents: { id: string; name: string; email: string }[] = [];
  const transferableQueues: { id: string; name: string; departmentName: string }[] = [];
  if (canAssign) {
    const memberships = await prisma.teamMember.findMany({
      where: {
        isActive: true,
        team: { queueId: ticket.queueId, isActive: true },
        user: { status: "ACTIVE", roleAssignments: { some: { role: { code: RoleCode.AGENT } } } },
      },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    const unique = new Map(memberships.map((membership) => [membership.user.id, membership.user]));
    agents.push(...unique.values());
  }
  if (canTransfer && ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.RESOLUTION_PENDING) {
    const globalFunctionalAdmin = hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN);
    const queues = await prisma.queue.findMany({
      where: {
        isActive: true,
        id: { not: ticket.queueId },
        department: { isActive: true },
        ...(globalFunctionalAdmin ? {} : { departmentId: actor.departmentId ?? "" }),
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
        teams: { select: { id: true, isActive: true } },
      },
      orderBy: { name: "asc" },
    });
    for (const queue of queues) {
      if (
        canManageQueue(subject, {
          requesterId: "",
          assignedToId: null,
          queueId: queue.id,
          departmentId: queue.departmentId,
          confidential: false,
          teamIds: queue.teams.filter((team) => team.isActive).map((team) => team.id),
        })
      ) {
        transferableQueues.push({
          id: queue.id,
          name: queue.name,
          departmentName: queue.department.name,
        });
      }
    }
  }
  return {
    canClaim: canActorClaimTicket(actor, { ...authorizationTicket, status: ticket.status }),
    canAssign,
    canTransfer,
    requiresAdministrativeReason: isFunctionalAdministrator(actor),
    canPostPublic,
    canPostInternal:
      canPostInternalMessage(roleCodes(actor)) &&
      hasPermission(actor, "ticket:internal-comment", target),
    allowedStatuses,
    agents,
    transferableQueues,
  };
}

export async function qualifyTicket(actor: UserContext, ticketId: string, input: TicketQualificationInput) {
  actor = await requireCurrentActor(actor);
  const parsed = ticketQualificationSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  const target = accessTarget(ticket);
  const subject = toAccessSubject(actor);
  if (!canViewTicket(subject, target) || !hasPermission(actor, "ticket:update", target) || !roleCodes(actor).some((role) => isStaffRole(role))) {
    throw new AuthorizationError("La qualification n’est pas autorisée dans ce périmètre.");
  }
  if (ticket.status === TicketStatus.CLOSED) throw new DomainError("Un ticket clôturé ne peut plus être qualifié.", 409);
  const priority = parsed.priority ?? calculatePriorityFromImpactUrgency(parsed.impact, parsed.urgency);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.ticket.updateMany({
      where: { id: ticketId, status: ticket.status },
      data: {
        impact: parsed.impact,
        urgency: parsed.urgency,
        priority,
        priorityOverrideReason: parsed.priority ? parsed.reason : null,
        legalDueAt: parsed.legalDueAt ?? null,
      },
    });
    if (changed.count !== 1) throw new DomainError("Le ticket a changé avant la qualification. Rechargez la fiche puis réessayez.", 409);
    const updated = await tx.ticket.findUnique({ where: { id: ticketId }, include: ticketSecurityInclude });
    if (!updated) throw new DomainError("Ticket introuvable après la qualification.", 404);
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: actor.id,
        queueId: ticket.queueId,
        eventType: TicketEventType.QUALIFIED,
        fromStatus: ticket.status,
        toStatus: ticket.status,
        metadata: { impact: parsed.impact, urgency: parsed.urgency, priority, legalDueAt: parsed.legalDueAt, reason: parsed.reason },
      },
    });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: "TICKET_QUALIFIED",
      objectType: "Ticket",
      objectId: ticketId,
      oldValue: { impact: ticket.impact, urgency: ticket.urgency, priority: ticket.priority, legalDueAt: ticket.legalDueAt },
      newValue: { impact: parsed.impact, urgency: parsed.urgency, priority, legalDueAt: parsed.legalDueAt ?? null },
      reason: parsed.reason,
    });
    return updated;
  });
}

export async function createTicketLink(actor: UserContext, ticketId: string, input: TicketLinkInput) {
  actor = await requireCurrentActor(actor);
  const parsed = ticketLinkSchema.parse(input);
  if (ticketId === parsed.toTicketId) throw new DomainError("Un ticket ne peut pas être lié à lui-même.", 422);
  const [fromTicket, toTicket] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude }),
    prisma.ticket.findUnique({ where: { id: parsed.toTicketId }, include: ticketAccessInclude }),
  ]);
  if (!fromTicket || !toTicket) throw new DomainError("Ticket introuvable.", 404);
  const subject = toAccessSubject(actor);
  if (!canViewTicket(subject, accessTarget(fromTicket)) || !canViewTicket(subject, accessTarget(toTicket)) || !hasPermission(actor, "ticket:update", accessTarget(fromTicket))) {
    throw new AuthorizationError("Vous ne pouvez pas relier ces tickets dans votre périmètre.");
  }
  const link = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketLink.create({
      data: { fromTicketId: ticketId, toTicketId: parsed.toTicketId, type: parsed.type, reason: parsed.reason ?? null, createdById: actor.id },
      include: { toTicket: { select: { id: true, reference: true, title: true, status: true, priority: true } } },
    });
    await tx.ticketEvent.create({ data: { ticketId, actorId: actor.id, queueId: fromTicket.queueId, eventType: TicketEventType.LINK_CREATED, metadata: { toTicketId: parsed.toTicketId, type: parsed.type, reason: parsed.reason } } });
    return created;
  });
  await appendAuditLog(prisma, { actorId: actor.id, action: "TICKET_LINK_CREATED", objectType: "TicketLink", objectId: link.id, newValue: { ticketId, toTicketId: parsed.toTicketId, type: parsed.type }, reason: parsed.reason });
  return link;
}

export async function listTicketLinksForViewer(actor: UserContext, ticketId: string) {
  actor = await requireCurrentActor(actor);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  if (!canViewTicket(toAccessSubject(actor), accessTarget(ticket))) throw new AuthorizationError("Vous n’avez pas accès à ce ticket.");
  const links = await prisma.ticketLink.findMany({
    where: { OR: [{ fromTicketId: ticketId }, { toTicketId: ticketId }] },
    include: {
      fromTicket: { select: { id: true, reference: true, title: true, status: true, priority: true } },
      toTicket: { select: { id: true, reference: true, title: true, status: true, priority: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return links;
}

export async function addSlaException(actor: UserContext, ticketId: string, input: SlaExceptionInput) {
  actor = await requireCurrentActor(actor);
  const parsed = slaExceptionSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  const target = accessTarget(ticket);
  const subject = toAccessSubject(actor);
  if (!canViewTicket(subject, target) || !hasPermission(actor, "ticket:update", target) || !canManageQueue(subject, target)) {
    throw new AuthorizationError("Seul un responsable habilité peut accorder une dérogation SLA.");
  }
  if (ticket.status === TicketStatus.CLOSED) throw new DomainError("Un ticket clôturé ne peut pas recevoir de dérogation SLA.", 409);
  const extension = parsed.addedMinutes * 60_000;
  const firstResponseDueAt = ticket.firstResponseDueAt ? new Date(ticket.firstResponseDueAt.getTime() + extension) : null;
  const resolutionDueAt = ticket.resolutionDueAt ? new Date(ticket.resolutionDueAt.getTime() + extension) : null;
  const exception = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticketId }, data: { firstResponseDueAt, resolutionDueAt } });
    const created = await tx.slaException.create({ data: { ticketId, createdById: actor.id, reason: parsed.reason, addedMinutes: parsed.addedMinutes, firstResponseDueAt, resolutionDueAt } });
    await tx.ticketEvent.create({ data: { ticketId, actorId: actor.id, queueId: ticket.queueId, eventType: TicketEventType.SLA_EXCEPTION_CREATED, metadata: { addedMinutes: parsed.addedMinutes, reason: parsed.reason, firstResponseDueAt, resolutionDueAt } } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: "SLA_EXCEPTION_CREATED",
      objectType: "Ticket",
      objectId: ticketId,
      oldValue: { firstResponseDueAt: ticket.firstResponseDueAt, resolutionDueAt: ticket.resolutionDueAt },
      newValue: { addedMinutes: parsed.addedMinutes, firstResponseDueAt, resolutionDueAt },
      reason: parsed.reason,
    });
    return created;
  });
  return exception;
}

export async function assignTicket(
actor: UserContext, ticketId: string, input: AssignmentInput) {
  actor = await requireCurrentActor(actor);
  const parsed = assignmentSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  if (!ticket.queue.isActive || !ticket.queue.department.isActive) {
    throw new DomainError("La file ou son département est inactif.", 409);
  }

  const target = accessTarget(ticket);
  const subject = toAccessSubject(actor);
  if (
    !canViewTicket(subject, target) ||
    !hasPermission(actor, "ticket:assign", target) ||
    !canAssignWithRoles(roleCodes(actor)) ||
    !canManageQueue(subject, target)
  ) {
    throw new AuthorizationError("Seul le responsable habilité de la file peut affecter ce ticket.");
  }
  if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLUTION_PENDING) {
    throw new DomainError("Ce ticket ne peut plus être affecté dans son état actuel.", 409);
  }
  if (ticket.assignedToId === parsed.assignedToId) {
    throw new DomainError("Ce ticket est déjà affecté à cet agent.", 422);
  }
  requireAdministrativeReason(actor, parsed.reason);

  const nextStatus = isClaimableStatus(ticket.status)
    ? TicketStatus.ASSIGNED
    : ticket.status;

  return prisma.$transaction(async (tx) => {
    // Re-check the agent inside the same transaction as the conditional ticket
    // update. A membership or user deactivation occurring after the initial
    // request check must never result in a stale assignment.
    const assignee = await tx.user.findFirst({
      where: {
        id: parsed.assignedToId,
        status: "ACTIVE",
        roleAssignments: { some: { role: { code: RoleCode.AGENT } } },
        teamMemberships: {
          some: {
            isActive: true,
            team: { queueId: ticket.queueId, isActive: true },
          },
        },
      },
      select: { id: true, name: true },
    });
    if (!assignee) {
      throw new DomainError("L’agent doit être actif et membre habilité de l’équipe de cette file.", 422);
    }
    const changed = await tx.ticket.updateMany({
      where: {
        id: ticketId,
        queueId: ticket.queueId,
        status: ticket.status,
        assignedToId: ticket.assignedToId,
      },
      data: { assignedToId: assignee.id, status: nextStatus },
    });
    if (changed.count !== 1) {
      throw new DomainError("Le ticket a changé avant l’affectation. Rechargez la fiche puis réessayez.", 409);
    }
    const updated = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: ticketSecurityInclude,
    });
    if (!updated) throw new DomainError("Ticket introuvable après l’affectation.", 404);
    await recordAssignment(tx, {
      ticketId,
      queueId: ticket.queueId,
      previousAssigneeId: ticket.assignedToId,
      newAssigneeId: assignee.id,
      assignedById: actor.id,
      reason: parsed.reason,
      fromStatus: ticket.status,
      toStatus: nextStatus,
      assignmentMode: "MANUAL",
    });
    await createInAppNotification(tx, {
      recipientId: assignee.id,
      ticketId,
      type: NotificationType.TICKET_ASSIGNED,
      title: "Ticket affecté",
      body: `${updated.reference} vous a été affecté par ${actor.name}.`,
    });
    if (ticket.assignedToId) {
      const recipients = new Set(
        [ticket.assignedToId, ticket.queue.managerId, ticket.requesterId]
          .filter(Boolean)
          .filter((recipientId) => recipientId !== actor.id && recipientId !== assignee.id) as string[],
      );
      for (const recipientId of recipients) {
        await createInAppNotification(tx, {
          recipientId,
          ticketId,
          type: NotificationType.ADMINISTRATIVE_ACTION,
          title: "Ticket réaffecté",
          body: `${updated.reference} a été réaffecté à ${assignee.name} par ${actor.name}. Motif : ${parsed.reason}`,
        });
      }
    }
    return updated;
  });
}

export async function claimTicket(
  actor: UserContext,
  ticketId: string,
  input: ClaimTicketInput = {},
) {
  actor = await requireCurrentActor(actor);
  const parsed = claimTicketSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  if (actor.status !== "ACTIVE" || !roleCodes(actor).includes(RoleCode.AGENT) || !hasPermission(actor, "ticket:claim")) {
    throw new AuthorizationError("Seul un agent actif peut prendre un ticket en charge.");
  }
  if (!ticket.queue.isActive || !ticket.queue.department.isActive) {
    throw new DomainError("La file ou son département est inactif.", 409);
  }
  if (ticket.assignedToId) {
    throw new DomainError("Ce ticket est déjà affecté à un autre agent.", 409);
  }
  if (!isClaimableStatus(ticket.status)) {
    throw new DomainError("Ce ticket ne peut pas être pris en charge dans son état actuel.", 409);
  }
  const membership = actor.teamMemberships.some(
    (item) =>
      item.team.queueId === ticket.queueId &&
      item.isActive &&
      item.team.isActive,
  );
  const target = accessTarget(ticket);
  if (
    !membership ||
    (actor.authorizedQueueId && actor.authorizedQueueId !== ticket.queueId) ||
    !canClaimTicket(toAccessSubject(actor), target)
  ) {
    throw new AuthorizationError("Vous devez être agent et membre actif d’une équipe de cette file.");
  }
  if (ticket.confidential && !canViewTicket(toAccessSubject(actor), target)) {
    throw new AuthorizationError("Ce ticket confidentiel ne vous est pas explicitement autorisé.");
  }

  return prisma.$transaction(async (tx) => {
    const activeMembership = await tx.teamMember.findFirst({
      where: {
        userId: actor.id,
        isActive: true,
        team: { queueId: ticket.queueId, isActive: true },
        user: { status: "ACTIVE", roleAssignments: { some: { role: { code: RoleCode.AGENT } } } },
      },
      select: { id: true },
    });
    if (!activeMembership) {
      throw new AuthorizationError("Votre appartenance active à une équipe de cette file n’est plus valide.");
    }
    const claimed = await tx.ticket.updateMany({
      where: {
        id: ticketId,
        queueId: ticket.queueId,
        assignedToId: null,
        status: { in: [...new Set([TicketStatus.NEW, TicketStatus.TO_QUALIFY, TicketStatus.TO_ASSIGN, TicketStatus.REOPENED])] },
      },
      data: { assignedToId: actor.id, status: TicketStatus.ASSIGNED },
    });
    if (claimed.count !== 1) {
      const current = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { assignedToId: true, status: true },
      });
      if (current?.assignedToId) {
        throw new DomainError("Ce ticket vient d’être pris par un autre agent.", 409);
      }
      throw new DomainError("Ce ticket n’est plus disponible pour une prise en charge.", 409);
    }

    const updated = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: ticketSecurityInclude,
    });
    if (!updated) throw new DomainError("Ticket introuvable après la prise en charge.", 404);

    await recordAssignment(tx, {
      ticketId,
      queueId: ticket.queueId,
      previousAssigneeId: null,
      newAssigneeId: actor.id,
      assignedById: actor.id,
      reason: parsed.reason,
      fromStatus: ticket.status,
      toStatus: TicketStatus.ASSIGNED,
      assignmentMode: "CLAIM",
    });
    await createInAppNotification(tx, {
      recipientId: actor.id,
      ticketId,
      type: NotificationType.TICKET_ASSIGNED,
      title: "Ticket pris en charge",
      body: `${updated.reference} vous est maintenant affecté.`,
    });
    if (ticket.queue.managerId && ticket.queue.managerId !== actor.id) {
      await createInAppNotification(tx, {
        recipientId: ticket.queue.managerId,
        ticketId,
        type: NotificationType.TICKET_ASSIGNED,
        title: "Ticket pris en charge par un agent",
        body: `${updated.reference} a été pris en charge par ${actor.name}.`,
      });
    }
    return updated;
  });
}

export async function transitionTicket(
  actor: UserContext,
  ticketId: string,
  input: TransitionTicketInput,
) {
  actor = await requireCurrentActor(actor);
  const parsed = transitionTicketSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ...ticketAccessInclude,
      requester: true,
      assignedTo: true,
    },
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  if (!canViewTicket(toAccessSubject(actor), accessTarget(ticket))) {
    throw new AuthorizationError("Vous n’avez pas accès à ce ticket.");
  }

  const requesterAction = actor.id === ticket.requesterId;
  if (!hasPermission(actor, "ticket:update")) {
    throw new AuthorizationError("La permission de faire évoluer ce ticket n’est pas accordée.");
  }
  if (!canTransitionStatus(ticket.status, parsed.status, roleCodes(actor), requesterAction)) {
    throw new AuthorizationError("Cette transition n’est pas autorisée pour votre rôle ou ce ticket.");
  }
  const actorRoles = roleCodes(actor);
  const transitionTarget = accessTarget(ticket);
  const isFunctionalAdminActor = actorRoles.includes(RoleCode.FUNCTIONAL_ADMIN);
  if (parsed.status === TicketStatus.CLOSED) {
    if (!canConfirmResolution(actorRoles, requesterAction)) {
      throw new AuthorizationError("Seul le demandeur peut confirmer la résolution.");
    }
    if (requesterAction && !hasPermission(actor, "ticket:confirm-resolution", transitionTarget) && !isFunctionalAdminActor) {
      throw new AuthorizationError("La confirmation de résolution n’est pas autorisée.");
    }
  }
  if (parsed.status === TicketStatus.REOPENED) {
    if (!canReopenResolution(actorRoles, requesterAction)) {
      throw new AuthorizationError("Seul le demandeur ou un administrateur fonctionnel peut rouvrir ce ticket.");
    }
    if (requesterAction && !hasPermission(actor, "ticket:reopen", transitionTarget) && !isFunctionalAdminActor) {
      throw new AuthorizationError("La réouverture n’est pas autorisée.");
    }
  }
  if (parsed.status === TicketStatus.IN_PROGRESS && !hasPermission(actor, "ticket:process", transitionTarget) && !isFunctionalAdminActor) {
    throw new AuthorizationError("La permission de démarrer le traitement n’est pas accordée.");
  }
  if (parsed.status === TicketStatus.BLOCKED && !hasPermission(actor, "ticket:block", transitionTarget) && !isFunctionalAdminActor) {
    throw new AuthorizationError("La permission de bloquer ce ticket n’est pas accordée.");
  }
  if (parsed.status === TicketStatus.RESOLUTION_PENDING && !hasPermission(actor, "ticket:resolve", transitionTarget) && !isFunctionalAdminActor) {
    throw new AuthorizationError("La permission de soumettre une résolution n’est pas accordée.");
  }
  const isAgentOnly = actorRoles.includes(RoleCode.AGENT) &&
    !actorRoles.includes(RoleCode.QUEUE_MANAGER) &&
    !actorRoles.includes(RoleCode.FUNCTIONAL_ADMIN);
  if (
    isAgentOnly &&
    parsed.status !== TicketStatus.TO_QUALIFY &&
    parsed.status !== TicketStatus.TO_ASSIGN &&
    ticket.assignedToId !== actor.id
  ) {
    throw new AuthorizationError("Un agent ne peut traiter que le ticket qui lui est affecté.");
  }
  const administrativeOverride = isFunctionalAdministrator(actor);
  requireAdministrativeReason(actor, parsed.reason);
  if (
    !requesterAction &&
    (parsed.status === TicketStatus.IN_PROGRESS || parsed.status === TicketStatus.BLOCKED || parsed.status === TicketStatus.RESOLUTION_PENDING) &&
    !ticket.assignedToId
  ) {
    throw new DomainError("Un agent doit être affecté avant cette transition.", 422);
  }
  if (parsed.status === TicketStatus.RESOLUTION_PENDING) {
    if (!parsed.resolutionCause || !parsed.resolutionAction || !parsed.resolutionSolution) {
      throw new DomainError("La cause, l’action réalisée et la solution sont obligatoires.", 422);
    }
  }
  if (parsed.status === TicketStatus.BLOCKED && (!parsed.blockReason || !parsed.blockDetails)) {
    throw new DomainError("Le motif et le détail du blocage sont obligatoires.", 422);
  }
  if (parsed.status === TicketStatus.REOPENED && !parsed.reopenedReason) {
    throw new DomainError("Le motif de réouverture est obligatoire.", 422);
  }

  const now = new Date();
  let totalPausedMinutes = ticket.totalPausedMinutes;
  let pauseDurationMinutes = 0;
  if (ticket.status === TicketStatus.BLOCKED && parsed.status !== TicketStatus.BLOCKED && ticket.slaPausedAt) {
    pauseDurationMinutes = Math.max(
      0,
      Math.floor((now.getTime() - ticket.slaPausedAt.getTime()) / 60_000),
    );
    totalPausedMinutes += pauseDurationMinutes;
  }
  const pauseExtension = pauseDurationMinutes * 60_000;

  const data: Prisma.TicketUncheckedUpdateInput = {
    status: parsed.status,
    assignedToId: parsed.status === TicketStatus.TO_ASSIGN ? null : undefined,
    blockReason: parsed.status === TicketStatus.BLOCKED ? parsed.blockReason : null,
    blockDetails: parsed.status === TicketStatus.BLOCKED ? parsed.blockDetails : null,
    resolutionCause: parsed.resolutionCause ?? undefined,
    resolutionAction: parsed.resolutionAction ?? undefined,
    resolutionSolution: parsed.resolutionSolution ?? undefined,
    preventiveAction: parsed.preventiveAction ?? undefined,
    reopenedReason: parsed.status === TicketStatus.REOPENED ? parsed.reopenedReason : undefined,
    resolvedAt:
      parsed.status === TicketStatus.RESOLUTION_PENDING
        ? now
        : parsed.status === TicketStatus.REOPENED
          ? null
          : undefined,
    closedAt:
      parsed.status === TicketStatus.CLOSED
        ? now
        : parsed.status === TicketStatus.REOPENED
          ? null
          : undefined,
    slaPausedAt:
      parsed.status === TicketStatus.BLOCKED
        ? ticket.slaPausedAt ?? now
        : ticket.status === TicketStatus.BLOCKED
          ? null
          : undefined,
    totalPausedMinutes,
    firstResponseDueAt: pauseExtension && ticket.firstResponseDueAt && !ticket.firstRespondedAt
      ? new Date(ticket.firstResponseDueAt.getTime() + pauseExtension)
      : undefined,
    resolutionDueAt: pauseExtension && ticket.resolutionDueAt && !ticket.resolvedAt
      ? new Date(ticket.resolutionDueAt.getTime() + pauseExtension)
      : undefined,
  };

  const notificationInputs: Parameters<typeof createInAppNotifications>[1] = [];
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.ticket.updateMany({
      where: {
        id: ticketId,
        status: ticket.status,
        assignedToId: ticket.assignedToId,
      },
      data,
    });
    if (changed.count !== 1) {
      throw new DomainError("Le ticket a changé avant la transition. Rechargez la fiche puis réessayez.", 409);
    }
    const updated = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: ticketSecurityInclude,
    });
    if (!updated) throw new DomainError("Ticket introuvable après la transition.", 404);
    const eventType = parsed.status === TicketStatus.REOPENED
      ? TicketEventType.REOPENED
      : parsed.status === TicketStatus.CLOSED
        ? TicketEventType.CLOSED
        : parsed.status === TicketStatus.RESOLUTION_PENDING
          ? TicketEventType.RESOLUTION_SUBMITTED
          : TicketEventType.STATUS_CHANGED;
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: actor.id,
        queueId: ticket.queueId,
        eventType,
        fromStatus: ticket.status,
        toStatus: parsed.status,
        metadata: {
          blockReason: parsed.blockReason,
          reopenedReason: parsed.reopenedReason,
          reason: parsed.reason,
          administrativeOverride,
          pauseDurationMinutes,
          totalPausedMinutes,
          firstResponseDueAt: updated.firstResponseDueAt,
          resolutionDueAt: updated.resolutionDueAt,
        },
      },
    });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: administrativeOverride ? "ADMINISTRATIVE_WORKFLOW_OVERRIDE" : "TICKET_STATUS_CHANGED",
      objectType: "Ticket",
      objectId: ticketId,
      oldValue: {
        status: ticket.status,
        assignedToId: ticket.assignedToId,
        totalPausedMinutes: ticket.totalPausedMinutes,
        firstResponseDueAt: ticket.firstResponseDueAt,
        resolutionDueAt: ticket.resolutionDueAt,
      },
      newValue: {
        status: parsed.status,
        assignedToId: updated.assignedTo?.id ?? null,
        totalPausedMinutes,
        firstResponseDueAt: updated.firstResponseDueAt,
        resolutionDueAt: updated.resolutionDueAt,
      },
      reason: parsed.reason ?? parsed.reopenedReason ?? parsed.blockDetails,
    });
    if (parsed.status === TicketStatus.TO_ASSIGN && ticket.assignedToId) {
      await recordAssignment(tx, {
        ticketId,
        queueId: ticket.queueId,
        previousAssigneeId: ticket.assignedToId,
        newAssigneeId: null,
        assignedById: actor.id,
        reason: parsed.reason ?? "Ticket retourné à la file pour affectation.",
        fromStatus: ticket.status,
        toStatus: parsed.status,
        assignmentMode: "UNASSIGN",
      });
    }

    if (administrativeOverride) {
      const recipients = new Set(
        [ticket.requesterId, ticket.assignedToId, ticket.queue.managerId]
          .filter(Boolean)
          .filter((recipientId) => recipientId !== actor.id) as string[],
      );
      for (const recipientId of recipients) {
        notificationInputs.push({
          recipientId,
          ticketId,
          type: NotificationType.ADMINISTRATIVE_ACTION,
          title: "Action administrative sur un ticket",
          body: `${actor.name} a fait évoluer ${ticket.reference} vers « ${parsed.status} ». Motif : ${parsed.reason}`,
        });
      }
    }

    if (parsed.status === TicketStatus.RESOLUTION_PENDING) {
      notificationInputs.push({
        recipientId: ticket.requesterId,
        ticketId,
        type: NotificationType.TICKET_RESOLVED,
        title: "Résolution à confirmer",
        body: `${ticket.reference} est marqué comme résolu. Confirmez la résolution ou demandez une reprise.`,
      });
    }
    if (parsed.status === TicketStatus.CLOSED) {
      notificationInputs.push({
        recipientId: ticket.requesterId,
        ticketId,
        type: NotificationType.TICKET_RESOLVED,
        title: "Ticket clôturé",
        body: `${ticket.reference} a été clôturé.`,
      });
    }
    if (parsed.status === TicketStatus.REOPENED) {
      const recipients = new Set(
        [ticket.assignedToId, ticket.queue.managerId].filter(Boolean) as string[],
      );
      for (const recipientId of recipients) {
        notificationInputs.push({
          recipientId,
          ticketId,
          type: NotificationType.TICKET_REOPENED,
          title: "Ticket réouvert",
          body: `${ticket.reference} a été réouvert : ${parsed.reopenedReason}`,
        });
      }
    }
    return updated;
  }, {
    maxWait: 10_000,
    timeout: 15_000,
  });

  if (notificationInputs.length) {
    after(async () => {
      try {
        await createInAppNotifications(prisma, notificationInputs);
      } catch (notificationError) {
        console.error("Ticket transition committed, but notification delivery failed.", notificationError);
      }
    });
  }

  return updated;
}

export async function addTicketMessage(actor: UserContext, ticketId: string, input: AddMessageInput) {
  actor = await requireCurrentActor(actor);
  const parsed = addMessageSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  if (!canViewTicket(toAccessSubject(actor), accessTarget(ticket))) {
    throw new AuthorizationError("Vous n’avez pas accès à ce ticket.");
  }
  const accessTargetForMessage = accessTarget(ticket);
  const publicCommentAllowed = hasPermission(actor, "ticket:comment:public", accessTargetForMessage) ||
    hasPermission(actor, "ticket:update", accessTargetForMessage);
  const internalCommentAllowed =
    canPostInternalMessage(roleCodes(actor)) &&
    hasPermission(actor, "ticket:internal-comment", accessTargetForMessage);
  if (parsed.visibility === MessageVisibility.REQUESTER && !publicCommentAllowed) {
    throw new AuthorizationError("La permission d’ajouter un commentaire public n’est pas accordée.");
  }
  if (parsed.visibility === MessageVisibility.INTERNAL && !internalCommentAllowed) {
    throw new AuthorizationError("Les commentaires internes sont réservés à l’équipe de traitement.");
  }

  return prisma.$transaction(async (tx) => {
    const message = await tx.ticketMessage.create({
      data: { ticketId, authorId: actor.id, body: parsed.body, visibility: parsed.visibility },
      include: { author: { select: { name: true } } },
    });
    let firstResponseRecorded = false;
    if (roleCodes(actor).some((role) => isStaffRole(role)) && !ticket.firstRespondedAt) {
      const result = await tx.ticket.updateMany({
        where: { id: ticketId, firstRespondedAt: null },
        data: { firstRespondedAt: new Date() },
      });
      firstResponseRecorded = result.count === 1;
    }
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: actor.id,
        queueId: ticket.queueId,
        eventType: TicketEventType.MESSAGE_ADDED,
        metadata: { visibility: parsed.visibility, firstResponseRecorded },
      },
    });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: parsed.visibility === MessageVisibility.INTERNAL ? "INTERNAL_MESSAGE_ADDED" : "MESSAGE_ADDED",
      objectType: "TicketMessage",
      objectId: message.id,
      newValue: { ticketId, visibility: parsed.visibility, firstResponseRecorded },
    });
    return message;
  });
}

export async function transferTicket(
  actor: UserContext,
  ticketId: string,
  input: QueueTransferInput,
) {
  actor = await requireCurrentActor(actor);
  const parsed = queueTransferSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  const sourceTarget = accessTarget(ticket);
  const subject = toAccessSubject(actor);
  if (!canViewTicket(subject, sourceTarget) || !hasPermission(actor, "ticket:transfer", sourceTarget) || !canManageQueue(subject, sourceTarget)) {
    throw new AuthorizationError("Seul un responsable habilité ou un administrateur peut transférer ce ticket.");
  }
  if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLUTION_PENDING) {
    throw new DomainError("Ce ticket ne peut pas être transféré dans son état actuel.", 409);
  }
  requireAdministrativeReason(actor, parsed.reason);

  const destination = await prisma.queue.findUnique({
    where: { id: parsed.queueId },
    include: { department: true },
  });
  if (!destination || !destination.isActive || !destination.department.isActive) {
    throw new DomainError("La file de destination n’est pas disponible.", 422);
  }
  if (destination.id === ticket.queueId) {
    throw new DomainError("La file de destination est identique à la file actuelle.", 422);
  }
  const destinationTeams = await prisma.team.findMany({
    where: { queueId: destination.id, isActive: true },
    select: { id: true },
  });
  if (!canManageQueue(subject, {
    requesterId: ticket.requesterId,
    assignedToId: null,
    queueId: destination.id,
    departmentId: destination.departmentId,
    confidential: false,
    teamIds: destinationTeams.map((team) => team.id),
  })) {
    throw new AuthorizationError("Vous n’êtes pas habilité à transférer vers cette file.");
  }

  const nextStatus = ticket.assignedToId
    ? TicketStatus.TO_ASSIGN
    : ticket.status;
  return prisma.$transaction(async (tx) => {
    const changed = await tx.ticket.updateMany({
      where: {
        id: ticketId,
        queueId: ticket.queueId,
        status: ticket.status,
        assignedToId: ticket.assignedToId,
      },
      data: {
        queueId: destination.id,
        assignedToId: null,
        status: nextStatus,
      },
    });
    if (changed.count !== 1) {
      throw new DomainError("Le ticket a changé avant le transfert. Rechargez la fiche puis réessayez.", 409);
    }
    const updated = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: ticketSecurityInclude,
    });
    if (!updated) throw new DomainError("Ticket introuvable après le transfert.", 404);
    await tx.ticketAssignment.create({
      data: {
        ticketId,
        queueId: destination.id,
        previousAssigneeId: ticket.assignedToId,
        newAssigneeId: null,
        assignedById: actor.id,
        reason: `Transfert de file : ${parsed.reason}`,
      },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: actor.id,
        queueId: destination.id,
        eventType: TicketEventType.ASSIGNED,
        fromStatus: ticket.status,
        toStatus: nextStatus,
        metadata: {
          assignmentMode: "TRANSFER",
          previousAssigneeId: ticket.assignedToId,
          newAssigneeId: null,
          fromQueueId: ticket.queueId,
          toQueueId: destination.id,
        },
      },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: actor.id,
        queueId: destination.id,
        eventType: TicketEventType.QUEUE_CHANGED,
        fromStatus: ticket.status,
        toStatus: nextStatus,
        metadata: {
          fromQueueId: ticket.queueId,
          toQueueId: destination.id,
          previousAssigneeId: ticket.assignedToId,
          slaPreserved: true,
        },
      },
    });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: "TICKET_QUEUE_TRANSFERRED",
      objectType: "Ticket",
      objectId: ticketId,
      oldValue: {
        queueId: ticket.queueId,
        assignedToId: ticket.assignedToId,
        status: ticket.status,
      },
      newValue: {
        queueId: destination.id,
        assignedToId: null,
        status: nextStatus,
        slaPreserved: true,
      },
      reason: parsed.reason,
    });

    const recipients = new Set(
      [
        ticket.requesterId,
        ticket.assignedToId,
        ticket.queue.managerId,
        destination.managerId,
        ...await queueWorkerIds(tx, destination.id),
      ].filter(Boolean) as string[],
    );
    for (const recipientId of recipients) {
      if (recipientId === actor.id) continue;
      await createInAppNotification(tx, {
        recipientId,
        ticketId,
        type: NotificationType.QUEUE_NEW_TICKET,
        title: "Ticket transféré dans votre file",
        body: `${updated.reference} a été transféré vers ${destination.name}. Le SLA existant est conservé.`,
      });
    }
    return updated;
  });
}

export async function grantConfidentialAccess(
  actor: UserContext,
  ticketId: string,
  input: ConfidentialAccessInput,
) {
  actor = await requireCurrentActor(actor);
  const parsed = confidentialAccessSchema.parse(input);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  if (!ticket.confidential) throw new DomainError("Ce ticket n’est pas marqué comme confidentiel.", 422);

  const target = accessTarget(ticket);
  const subject = toAccessSubject(actor);
  const functionalOrManager = hasPermission(actor, "ticket:confidential-access", target) && canManageQueue(subject, target);
  const technicalScoped = hasScopedRole(subject, [RoleCode.TECHNICAL_ADMIN], target) && hasPermission(actor, "technical:manage", target);
  if (!functionalOrManager && !technicalScoped) {
    throw new AuthorizationError("Vous n’êtes pas habilité à accorder cet accès confidentiel.");
  }

  const beneficiary = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!beneficiary || beneficiary.status !== "ACTIVE") {
    throw new DomainError("La personne à autoriser doit être active.", 422);
  }

  return prisma.$transaction(async (tx) => {
    await tx.ticketAccess.upsert({
      where: { ticketId_userId: { ticketId, userId: beneficiary.id } },
      update: { grantedBy: actor.id, grantedAt: new Date() },
      create: { ticketId, userId: beneficiary.id, grantedBy: actor.id },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: actor.id,
        queueId: ticket.queueId,
        eventType: TicketEventType.CONFIDENTIAL_ACCESS_GRANTED,
        metadata: {
          userId: beneficiary.id,
          exceptionalTechnicalAccess: technicalScoped && !functionalOrManager,
        },
      },
    });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: "CONFIDENTIAL_ACCESS_GRANTED",
      objectType: "Ticket",
      objectId: ticketId,
      newValue: { userId: beneficiary.id },
      reason: parsed.reason,
    });
    if (beneficiary.id !== actor.id) {
      await createInAppNotification(tx, {
        recipientId: beneficiary.id,
        ticketId,
        type: NotificationType.CONFIDENTIAL_ACCESS,
        title: "Accès confidentiel accordé",
        body: `${actor.name} vous a accordé un accès nominatif à ${ticket.reference}. Motif : ${parsed.reason}`,
      });
    }
    if (ticket.queue.managerId && ticket.queue.managerId !== actor.id) {
      await createInAppNotification(tx, {
        recipientId: ticket.queue.managerId,
        ticketId,
        type: NotificationType.CONFIDENTIAL_ACCESS,
        title: "Accès confidentiel accordé",
        body: `${actor.name} a autorisé ${beneficiary.name} sur un dossier confidentiel. Motif : ${parsed.reason}`,
      });
    }
    return { ok: true };
  });
}

export async function listVisibleQueues(
  actor: UserContext,
  options: { includePersonal?: boolean } = {},
) {
  actor = await requireCurrentActor(actor);
  const subject = toAccessSubject(actor);
  const queues = await prisma.queue.findMany({
    where: { isActive: true, department: { isActive: true } },
    include: {
      department: true,
      manager: { select: { id: true, name: true } },
      teams: { select: { id: true, isActive: true } },
      _count: { select: { tickets: true, teams: true } },
    },
    orderBy: { name: "asc" },
  });
  const personalQueueIds = options.includePersonal
    ? new Set(
        (
          await prisma.ticket.findMany({
            where: await visibleTicketWhere(actor),
            select: { queueId: true },
            distinct: ["queueId"],
          })
        ).map((ticket) => ticket.queueId),
      )
    : new Set<string>();
  const visibleQueues = queues.filter((queue) =>
    personalQueueIds.has(queue.id) ||
    canViewTicket(subject, {
      requesterId: "",
      assignedToId: null,
      queueId: queue.id,
      departmentId: queue.departmentId,
      confidential: false,
      teamIds: queue.teams.filter((team) => team.isActive).map((team) => team.id),
    }),
  );
  const visibleWhere = await visibleTicketWhere(actor, { workQueue: true });
  const visibleQueueIds = visibleQueues.map((queue) => queue.id);
  const riskDeadline = new Date(Date.now() + SLA_RISK_WINDOW_MINUTES * 60_000);
  const [ticketStats, slaStats] = visibleQueueIds.length
    ? await Promise.all([
      prisma.ticket.groupBy({
        by: ["queueId", "status", "priority"],
        where: { AND: [visibleWhere, { queueId: { in: visibleQueueIds } }] },
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ["queueId"],
        where: {
          AND: [
            visibleWhere,
            { queueId: { in: visibleQueueIds } },
            { status: { notIn: [TicketStatus.CLOSED, TicketStatus.BLOCKED] }, slaPausedAt: null },
            {
              OR: [
                { firstResponseDueAt: { not: null, lte: riskDeadline }, firstRespondedAt: null },
                {
                  resolutionDueAt: { not: null, lte: riskDeadline },
                  resolvedAt: null,
                  status: { not: TicketStatus.RESOLUTION_PENDING },
                },
              ],
            },
          ],
        },
        _count: { _all: true },
      }),
    ])
    : [[], []];
  const ticketStatsByQueue = new Map<string, typeof ticketStats>();
  for (const row of ticketStats) {
    const rows = ticketStatsByQueue.get(row.queueId) ?? [];
    rows.push(row);
    ticketStatsByQueue.set(row.queueId, rows);
  }
  const slaByQueue = new Map(slaStats.map((row) => [row.queueId, row._count._all]));

  return visibleQueues.map((queue) => {
    const queueStats = ticketStatsByQueue.get(queue.id) ?? [];
    const ticketCount = queueStats.reduce((sum, row) => sum + row._count._all, 0);
    const activeStats = queueStats.filter((row) => row.status !== TicketStatus.CLOSED);
    return {
      ...queue,
      _count: {
        ...queue._count,
        // Queue cards must not reveal the number of confidential tickets that
        // fall outside the viewer's effective perimeter.
        tickets: ticketCount,
      },
      operationalStats: {
        urgent: activeStats
          .filter((row) => row.priority === Priority.HIGH || row.priority === Priority.CRITICAL)
          .reduce((sum, row) => sum + row._count._all, 0),
        blocked: activeStats
          .filter((row) => row.status === TicketStatus.BLOCKED)
          .reduce((sum, row) => sum + row._count._all, 0),
        slaAtRisk: slaByQueue.get(queue.id) ?? 0,
      },
    };
  });
}

/** Queue metadata for ticket filters, without dashboard counters or SLA scans. */
export async function listVisibleQueueFilterOptions(actor: UserContext) {
  actor = await requireCurrentActor(actor);
  const subject = toAccessSubject(actor);
  const queues = await prisma.queue.findMany({
    where: { isActive: true, department: { isActive: true } },
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      teams: { select: { id: true, isActive: true } },
    },
    orderBy: { name: "asc" },
  });

  return queues
    .filter((queue) => canViewTicket(subject, {
      requesterId: "",
      assignedToId: null,
      queueId: queue.id,
      departmentId: queue.departmentId,
      confidential: false,
      teamIds: queue.teams.filter((team) => team.isActive).map((team) => team.id),
    }))
    .map(({ id, name, department }) => ({ id, name, department }));
}

const MAX_TICKET_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TICKET_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function ticketAttachmentRoot() {
  return path.join(process.cwd(), "var", "ticket-attachments");
}

function safeAttachmentFileName(name: string) {
  const sanitized = name.normalize("NFKC").replace(/[\\/\\u0000-\\u001f]/g, "_").trim();
  return sanitized.slice(0, 180) || "piece-jointe";
}

async function getAuthorizedTicketForAttachment(actor: UserContext, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  const target = accessTarget(ticket);
  if (!canViewTicket(toAccessSubject(actor), target)) {
    throw new AuthorizationError("Vous n’avez pas accès aux pièces jointes de ce ticket.");
  }
  const canUpload =
    hasPermission(actor, "ticket:comment:public", target) ||
    hasPermission(actor, "ticket:update", target);
  if (!canUpload) throw new AuthorizationError("Vous ne pouvez pas ajouter de pièce jointe à ce ticket.");
  return ticket;
}

export async function uploadTicketAttachment(
  actor: UserContext,
  ticketId: string,
  input: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
) {
  actor = await requireCurrentActor(actor);
  const ticket = await getAuthorizedTicketForAttachment(actor, ticketId);
  if (!input.name.trim()) throw new DomainError("Le nom du fichier est obligatoire.", 422);
  if (!Number.isFinite(input.size) || input.size < 1 || input.size > MAX_TICKET_ATTACHMENT_BYTES) {
    throw new DomainError("La pièce jointe doit peser entre 1 octet et 10 Mo.", 422);
  }
  if (!ALLOWED_TICKET_ATTACHMENT_TYPES.has(input.type)) {
    throw new DomainError("Ce type de fichier n’est pas autorisé.", 422);
  }
  const storageKey = `${ticketId}/${randomUUID()}`;
  const storagePath = path.join(ticketAttachmentRoot(), storageKey);
  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, Buffer.from(await input.arrayBuffer()));
  try {
    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        uploadedById: actor.id,
        fileName: safeAttachmentFileName(input.name),
        storageKey,
        mimeType: input.type,
        sizeBytes: input.size,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        messageId: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    await appendAuditLog(prisma, {
      actorId: actor.id,
      action: "TICKET_ATTACHMENT_ADDED",
      objectType: "Attachment",
      objectId: attachment.id,
      newValue: { ticketId, fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes },
      reason: "Ajout d’une pièce jointe au ticket.",
    });
    return attachment;
  } catch (error) {
    await unlink(storagePath).catch(() => undefined);
    throw error;
  }
}

export async function getTicketAttachmentForViewer(actor: UserContext, ticketId: string, attachmentId: string) {
  actor = await requireCurrentActor(actor);
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, ticketId },
    include: { ticket: { include: ticketAccessInclude }, message: { select: { visibility: true } } },
  });
  if (!attachment) throw new DomainError("Pièce jointe introuvable.", 404);
  const ticket = attachment.ticket;
  const target = accessTarget(ticket);
  if (!canViewTicket(toAccessSubject(actor), target)) throw new AuthorizationError("Vous n’avez pas accès à cette pièce jointe.");
  const canSeeInternal = canPostInternalMessage(roleCodes(actor)) && hasPermission(actor, "ticket:internal-comment", target);
  if (attachment.message?.visibility === MessageVisibility.INTERNAL && !canSeeInternal) {
    throw new AuthorizationError("Cette pièce jointe est réservée à l’équipe de traitement.");
  }
  const storagePath = path.join(ticketAttachmentRoot(), attachment.storageKey);
  let content: Buffer;
  try {
    content = await readFile(storagePath);
  } catch {
    throw new DomainError("Le fichier n’est plus disponible dans le stockage local.", 410);
  }
  return { content, fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes };
}

export async function listTicketAttachmentsForViewer(actor: UserContext, ticketId: string) {
  actor = await requireCurrentActor(actor);
  const accessRecord = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!accessRecord) throw new DomainError("Ticket introuvable.", 404);
  if (!canViewTicket(toAccessSubject(actor), accessTarget(accessRecord))) {
    throw new AuthorizationError("Vous n’avez pas accès aux pièces jointes de ce ticket.");
  }
  const canSeeInternal =
    canPostInternalMessage(roleCodes(actor)) &&
    hasPermission(actor, "ticket:internal-comment", accessTarget(accessRecord));
  return prisma.attachment.findMany({
    where: {
      ticketId,
      ...(canSeeInternal
        ? {}
        : { OR: [{ messageId: null }, { message: { visibility: MessageVisibility.REQUESTER } }] }),
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
      messageId: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
