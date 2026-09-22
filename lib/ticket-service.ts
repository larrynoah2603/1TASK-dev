import { after } from "next/server";
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
import { readServerEnvironment } from "@/lib/env";
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
  canPostInternalMessage,
  isClaimableStatus,
  isStaffRole,
  makeTicketReference,
} from "@/lib/domain";
import { calculateSlaDeadlines } from "@/lib/sla";
import { createInAppNotification } from "@/lib/notifications";
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
  ticketLinkSchema,
  type AddMessageInput,
  type AssignmentInput,
  type ClaimTicketInput,
  type ConfidentialAccessInput,
  type CreateTicketInput,
  type QueueTransferInput,
  type TicketLinkInput,
} from "@/lib/validation";
import { routeTicketFromCatalog } from "@/lib/routing";
import { measureServerOperation } from "@/lib/performance";
import { DomainError } from "@/lib/domain-error";
import { logServerError } from "@/lib/http";
import { accessTarget, ticketAccessInclude, ticketSecurityInclude, type AccessTicket } from "@/lib/ticket-access";
import { chooseAutoAssignee, recordAssignment } from "@/lib/ticket-assignment-service";
import { notifyQueueWorkers, queueWorkerIds } from "@/lib/ticket-notification-service";

export { addSlaException } from "@/lib/ticket-sla-service";
export { qualifyTicket, transitionTicket } from "@/lib/ticket-workflow-service";

export { DomainError } from "@/lib/domain-error";

function isTicketCreationIdempotencyConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  return Array.isArray(target) && target.includes("creationIdempotencyToken");
}

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
      logServerError("ticket_creation_notification_failed", notificationError, { ticketId: result.ticket.id });
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

/**
 * Reconciles a client-side timeout without replaying the complete creation
 * workflow. The creator and token form the database uniqueness boundary, so a
 * token can never reveal another user's ticket.
 */
export async function findCreatedTicketByToken(actor: UserContext, token: string) {
  actor = await requireCurrentActor(actor);
  return prisma.ticket.findFirst({
    where: {
      createdById: actor.id,
      creationIdempotencyToken: token,
    },
    select: {
      id: true,
      reference: true,
      status: true,
    },
  });
}

export {
  getOperationalTicketSummary,
  getRequesterTicketSummary,
  listVisibleTickets,
  listVisibleTicketsPage,
  visibleTicketWhere,
} from "@/lib/ticket-query-service";
export type {
  TicketListOptions,
  TicketListScope,
  TicketListSlaFilter,
  TicketListSort,
} from "@/lib/ticket-query-service";

export { getTicketForViewer } from "@/lib/ticket-detail-service";

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

export async function getTicketActionContext(
  actor: UserContext,
  ticket: AccessTicket & { status: TicketStatus; actionAccess?: AccessTicket },
) {
  actor = await requireCurrentActor(actor);
  // The detail service already performed a final authorization recheck and
  // provides the exact access snapshot used here. Mutations still reauthorize
  // independently in their own server handlers.
  const authorizationTicket = ticket.actionAccess ?? ticket;
  const subject = toAccessSubject(actor);
  const target = accessTarget(authorizationTicket);
  if (!canViewTicket(subject, target)) {
    throw new AuthorizationError("Vous n’avez pas accès aux actions de ce ticket.");
  }

  const canAssign = hasPermission(actor, "ticket:assign", target) &&
    canAssignWithRoles(roleCodes(actor)) &&
    canManageQueue(subject, target);
  const canTransfer = hasPermission(actor, "ticket:transfer", target) &&
    canManageQueue(subject, target);
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
  };
}

async function requireTicketActionTarget(actor: UserContext, ticketId: string) {
  actor = await requireCurrentActor(actor);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketAccessInclude,
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  const subject = toAccessSubject(actor);
  const target = accessTarget(ticket);
  if (!canViewTicket(subject, target)) {
    throw new AuthorizationError("Vous n’avez pas accès aux actions de ce ticket.");
  }
  return { actor, ticket, subject, target };
}

export async function listTicketAssignmentOptions(actor: UserContext, ticketId: string) {
  const current = await requireTicketActionTarget(actor, ticketId);
  if (
    !hasPermission(current.actor, "ticket:assign", current.target) ||
    !canAssignWithRoles(roleCodes(current.actor)) ||
    !canManageQueue(current.subject, current.target)
  ) {
    throw new AuthorizationError("Vous n’êtes pas habilité à affecter ce ticket.");
  }

  const memberships = await prisma.teamMember.findMany({
    where: {
      isActive: true,
      team: { queueId: current.ticket.queueId, isActive: true },
      user: { status: "ACTIVE", roleAssignments: { some: { role: { code: RoleCode.AGENT } } } },
    },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return [...new Map(memberships.map((membership) => [membership.user.id, membership.user])).values()];
}

export async function listTicketTransferOptions(actor: UserContext, ticketId: string) {
  const current = await requireTicketActionTarget(actor, ticketId);
  if (
    !hasPermission(current.actor, "ticket:transfer", current.target) ||
    !canManageQueue(current.subject, current.target)
  ) {
    throw new AuthorizationError("Vous n’êtes pas habilité à réorienter ce ticket.");
  }
  if (
    current.ticket.status === TicketStatus.CLOSED ||
    current.ticket.status === TicketStatus.RESOLUTION_PENDING
  ) {
    return [];
  }

  const globalFunctionalAdmin = hasGlobalRole(current.subject, RoleCode.FUNCTIONAL_ADMIN);
  const queues = await prisma.queue.findMany({
    where: {
      isActive: true,
      id: { not: current.ticket.queueId },
      department: { isActive: true },
      ...(globalFunctionalAdmin ? {} : { departmentId: current.actor.departmentId ?? "" }),
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

  return queues.flatMap((queue) =>
    canManageQueue(current.subject, {
      requesterId: "",
      assignedToId: null,
      queueId: queue.id,
      departmentId: queue.departmentId,
      confidential: false,
      teamIds: queue.teams.filter((team) => team.isActive).map((team) => team.id),
    })
      ? [{ id: queue.id, name: queue.name, departmentName: queue.department.name }]
      : [],
  );
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
