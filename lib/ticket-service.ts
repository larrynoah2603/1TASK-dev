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
  canManagerClaimTicket,
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
  v1RequesterAllowedNextStatuses,
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
  userContextInclude,
} from "@/lib/server-auth";
import {
  addMessageSchema,
  assignmentSchema,
  claimTicketSchema,
  confidentialAccessSchema,
  createTicketSchema,
  createV1TicketSchema,
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
import { matchCatalogService, routeTicketFromCatalog, type CatalogCandidate } from "@/lib/routing";
import { assertOperationalGlobalTriage, V1_CONFIGURATION_ID } from "@/lib/triage-configuration";
import { resolveConfidentialRecipient } from "@/lib/confidential-ticket-service";
import { measureServerOperation } from "@/lib/performance";
import { DomainError } from "@/lib/domain-error";
import { logServerError } from "@/lib/http";
import { accessTarget, ticketAccessInclude, ticketSecurityInclude, type AccessTicket } from "@/lib/ticket-access";
import { automaticAssignmentOutcome, chooseAutoAssignee, recordAssignment, shouldAutomaticallyAssign, tryAcquireTicketClaim } from "@/lib/ticket-assignment-service";
import { assertProductCapability, resolveProductCapabilities } from "@/lib/product-policy";
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

export async function createTicket(actor: UserContext, input: unknown) {
  actor = await requireCurrentActor(actor);
  if (!hasPermission(actor, "ticket:create")) {
    throw new AuthorizationError("La permission de créer un ticket n’est pas accordée.");
  }
  ensureActorDepartment(actor);
  const v1Profile = readServerEnvironment().PRODUCT_PROFILE === "v1";
  const productCapabilities = resolveProductCapabilities(readServerEnvironment().PRODUCT_PROFILE);
  const parsed = (v1Profile ? createV1TicketSchema : createTicketSchema).parse(input);
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
  const targetDepartment = !v1Profile && parsed.targetDepartmentId
    ? await prisma.department.findFirst({ where: { id: parsed.targetDepartmentId, isActive: true }, select: { id: true, code: true, name: true } })
    : null;
  if (!v1Profile && !parsed.serviceCatalogItemId && (!targetDepartment || !parsed.requestedService)) {
    throw new DomainError("Le besoin libre et le département cible sont obligatoires.", 422);
  }
  if (!parsed.serviceCatalogItemId && targetDepartment && targetDepartment.id !== actor.departmentId && !hasPermission(actor, "ticket:create:cross-department")) {
    throw new AuthorizationError("Vous ne pouvez pas envoyer une demande libre vers ce département.");
  }

  const serviceInclude = {
    queue: {
      include: {
        department: true,
        escalationRules: { where: { isActive: true }, select: { id: true, thresholdPercent: true, targetRole: true } },
      },
    },
    sla: { include: { calendar: { include: { holidays: true } } } },
    escalationRules: { where: { isActive: true }, select: { id: true, thresholdPercent: true, targetRole: true } },
  } satisfies Prisma.ServiceCatalogItemInclude;

  const configuredGlobalTriageServiceId = v1Profile
    ? (await prisma.v1Configuration.findUnique({
        where: { id: V1_CONFIGURATION_ID },
        select: { globalTriageServiceId: true },
      }))?.globalTriageServiceId ?? null
    : null;

  let matchedBy: "catalog-id" | "keyword" | "name" | "category" | "text" = "catalog-id";
  let routingMode: "CATALOG" | "AUTO_CATALOG" | "TRIAGE" = "CATALOG";
  let service: Prisma.ServiceCatalogItemGetPayload<{ include: typeof serviceInclude }> | null | undefined;
  if (parsed.serviceCatalogItemId) {
    if (v1Profile && parsed.serviceCatalogItemId === configuredGlobalTriageServiceId) {
      throw new DomainError("Le service de triage global est réservé au routage automatique.", 422);
    }
    service = await prisma.serviceCatalogItem.findFirst({
      where: { id: parsed.serviceCatalogItemId, isActive: true, provisionedTriageDepartmentId: null, queue: { isActive: true, department: { isActive: true } } },
      include: serviceInclude,
    });
  } else {
    const candidates = await prisma.serviceCatalogItem.findMany({
      where: {
        isActive: true,
        provisionedTriageDepartmentId: null,
        ...(v1Profile && configuredGlobalTriageServiceId ? { id: { not: configuredGlobalTriageServiceId } } : {}),
        queue: { isActive: true, ...(v1Profile ? {} : { departmentId: targetDepartment?.id }), department: { isActive: true } },
      },
      include: serviceInclude,
    });
    const catalogCandidates: CatalogCandidate[] = candidates.map((candidate) => ({
      id: candidate.id, code: candidate.code, name: candidate.name, description: candidate.description,
      ticketType: candidate.ticketType, category: candidate.category, queueId: candidate.queueId,
      priorityDefault: candidate.priorityDefault, keywords: candidate.keywords,
    }));
    const automaticMatch = matchCatalogService({
      requestedService: v1Profile ? undefined : parsed.requestedService,
      title: parsed.title,
      description: parsed.description,
      candidates: catalogCandidates,
    });
    if (automaticMatch) {
      service = candidates.find((candidate) => candidate.id === automaticMatch.serviceCatalogItemId);
      matchedBy = automaticMatch.matchedBy;
      routingMode = "AUTO_CATALOG";
    } else {
      service = v1Profile
        ? await assertOperationalGlobalTriage(prisma)
        : candidates.find((candidate) => candidate.code === `TRIAGE-${targetDepartment?.code}`);
      matchedBy = "catalog-id";
      routingMode = "TRIAGE";
    }
  }
  if (!service || !service.queue.isActive || !service.queue.department.isActive) {
    throw new DomainError("Le service sélectionné n’est pas disponible.", 422);
  }
  if (parsed.confidential) assertProductCapability(productCapabilities, "confidentialTicketCreation");
  const confidentialResolution = parsed.confidential ? await resolveConfidentialRecipient(service.id) : null;
  if (confidentialResolution && parsed.confidentialityVersion !== confidentialResolution.version) {
    throw new DomainError("La configuration confidentielle a changé. Vérifiez à nouveau le destinataire avant de confirmer.", 409);
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

  const productionContext = v1Profile ? { dossierId: null, missionId: null } : await resolveTicketProductionContext(actor, parsed);

  const routing = routeTicketFromCatalog({
    serviceCatalogItemId: service.id,
    candidates: [
    {
      id: service.id,
      code: service.code,
      name: service.name,
      ticketType: service.ticketType,
      category: service.category,
      queueId: service.queueId,
      priorityDefault: service.priorityDefault,
      keywords: service.keywords,
    },
    ],
  });
  const now = new Date();
  const initialStatus = routingMode === "TRIAGE" ? TicketStatus.TO_QUALIFY : TicketStatus.NEW;
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
        requestedService: v1Profile ? null : parsed.requestedService ?? null,
        confidential: parsed.confidential,
        type: routing.type,
        category: routing.category,
        priority: v1Profile ? service.priorityDefault : calculatePriorityFromImpactUrgency(parsed.impact, parsed.urgency),
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
              routingMode,
              requestedService: v1Profile ? null : parsed.requestedService ?? null,
              matchedBy,
              catalogItemId: service.id,
              catalogCode: service.code,
              routedDepartmentId: service.queue.departmentId,
              routedQueueId: service.queueId,
              ticketType: routing.type,
              category: routing.category,
              initialStatus,
              priority: v1Profile ? service.priorityDefault : calculatePriorityFromImpactUrgency(parsed.impact, parsed.urgency),
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

    if (confidentialResolution) {
      await tx.ticketAccess.createMany({
        data: [
          { ticketId: ticket.id, userId: actor.id, grantedBy: actor.id },
          { ticketId: ticket.id, userId: confidentialResolution.recipient.id, grantedBy: actor.id, delegationId: confidentialResolution.delegation?.id ?? null },
        ],
        skipDuplicates: true,
      });
      await appendAuditLog(tx, {
        actorId: actor.id,
        action: "CONFIDENTIAL_RECIPIENT_ACCESS_GRANTED",
        objectType: "Ticket",
        objectId: ticket.id,
        newValue: { recipientId: confidentialResolution.recipient.id, delegationId: confidentialResolution.delegation?.id ?? null },
      });
    }

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
    if (!parsed.confidential && routingMode !== "TRIAGE" && shouldAutomaticallyAssign(productCapabilities, service.queue.autoAssignment)) {
      const candidate = await chooseAutoAssignee(tx, routing.queueId, service.keywords);
      if (candidate) {
        const outcome = automaticAssignmentOutcome(candidate.userId, ticket.status);
        ticket = await tx.ticket.update({
          where: { id: ticket.id },
          data: outcome,
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
      confidentialRecipientId: confidentialResolution?.recipient.id ?? null,
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

      if (result.confidentialRecipientId) {
        await createInAppNotification(prisma, {
          recipientId: result.confidentialRecipientId,
          ticketId: result.ticket.id,
          type: NotificationType.QUEUE_NEW_TICKET,
          title: "Nouveau ticket confidentiel",
          body: "Un nouveau ticket confidentiel nécessite votre attention. Ouvrez 1TASK pour le consulter.",
        });
      } else if (result.autoAssigned && result.autoAssignedUserId) {
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
  if (actor.status !== "ACTIVE" || ticket.queue.isActive === false || ticket.queue.department?.isActive === false || !isClaimableStatus(ticket.status) || ticket.assignedToId) {
    return false;
  }
  const target = accessTarget(ticket);
  const subject = toAccessSubject(actor);
  if (!hasPermission(actor, "ticket:claim", target) || !canViewTicket(subject, target) || !canClaimTicket(subject, target)) return false;
  const roles = roleCodes(actor);
  const activeAgentMembership = roles.includes(RoleCode.AGENT) && actor.teamMemberships.some(
    (item) => item.team.queueId === ticket.queueId && item.isActive && item.team.isActive,
  );
  const managerScope = roles.includes(RoleCode.QUEUE_MANAGER) && canManagerClaimTicket(subject, target);
  return activeAgentMembership || managerScope;
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

  const terminal = ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED;
  const canAssign = !terminal && hasPermission(actor, "ticket:assign", target) &&
    canAssignWithRoles(roleCodes(actor)) &&
    canManageQueue(subject, target);
  const canTransfer = !terminal && hasPermission(actor, "ticket:transfer", target) &&
    canManageQueue(subject, target);
  const canPostPublic =
    !terminal && (hasPermission(actor, "ticket:comment:public", target) ||
    hasPermission(actor, "ticket:update", target));
  const requesterAction = actor.id === ticket.requesterId;
  const v1RequesterView = readServerEnvironment().PRODUCT_PROFILE === "v1" && requesterAction;
  const v1Profile = readServerEnvironment().PRODUCT_PROFILE === "v1";
  let allowedStatuses = v1RequesterView
    ? v1RequesterAllowedNextStatuses(ticket.status)
    : allowedNextStatuses(ticket.status, roleCodes(actor), requesterAction);
  if (v1Profile && !requesterAction) {
    allowedStatuses = allowedStatuses.filter(
      (status) =>
        status !== TicketStatus.CLOSED &&
        status !== TicketStatus.REOPENED &&
        status !== TicketStatus.CANCELLED,
    );
  }
  if (!ticket.assignedToId) {
    allowedStatuses = allowedStatuses.filter(
      (status) =>
        status !== TicketStatus.IN_PROGRESS &&
        status !== TicketStatus.BLOCKED &&
        status !== TicketStatus.RESOLUTION_PENDING,
    );
  }

  return {
    canClaim: v1RequesterView ? false : canActorClaimTicket(actor, { ...authorizationTicket, status: ticket.status }),
    canAssign: v1RequesterView ? false : canAssign,
    canTransfer: v1RequesterView ? false : canTransfer,
    requiresAdministrativeReason: !v1RequesterView && isFunctionalAdministrator(actor),
    canPostPublic,
    canPostInternal:
      !v1RequesterView &&
      !terminal && canPostInternalMessage(roleCodes(actor)) &&
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

  if (current.ticket.status === TicketStatus.CLOSED || current.ticket.status === TicketStatus.CANCELLED) return [];
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
    current.ticket.status === TicketStatus.CANCELLED ||
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
  if (fromTicket.status === TicketStatus.CLOSED || fromTicket.status === TicketStatus.CANCELLED) throw new DomainError("Un ticket terminé est conservé en lecture seule.", 409);
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
  if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.RESOLUTION_PENDING) {
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
  if (!ticket.queue.isActive || !ticket.queue.department.isActive) {
    throw new DomainError("La file ou son département est inactif.", 409);
  }
  if (ticket.assignedToId) throw new DomainError("Ce ticket est déjà affecté à un autre agent.", 409);
  if (!isClaimableStatus(ticket.status)) throw new DomainError("Ce ticket ne peut pas être pris en charge dans son état actuel.", 409);
  if (!canActorClaimTicket(actor, ticket)) {
    throw new AuthorizationError("Vous n’êtes plus autorisé à prendre en charge ce ticket dans cette file.");
  }

  return prisma.$transaction(async (tx) => {
    const [freshActor, freshTicket] = await Promise.all([
      tx.user.findUnique({ where: { id: actor.id }, include: userContextInclude }),
      tx.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude }),
    ]);
    if (!freshActor || !freshTicket || !canActorClaimTicket(freshActor, freshTicket)) {
      throw new AuthorizationError("Votre identité, votre périmètre ou votre accès au ticket n’est plus valide.");
    }
    const claimStatus = readServerEnvironment().PRODUCT_PROFILE === "v1"
      ? freshTicket.status === TicketStatus.TO_QUALIFY
        ? TicketStatus.TO_QUALIFY
        : TicketStatus.IN_PROGRESS
      : TicketStatus.ASSIGNED;
    const claimed = await tryAcquireTicketClaim(tx, {
      ticketId,
      queueId: freshTicket.queueId,
      actorId: actor.id,
      targetStatus: claimStatus,
    });
    if (!claimed) {
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
      queueId: freshTicket.queueId,
      previousAssigneeId: null,
      newAssigneeId: actor.id,
      assignedById: actor.id,
      reason: parsed.reason,
      fromStatus: freshTicket.status,
      toStatus: claimStatus,
      assignmentMode: "CLAIM",
    });
    await createInAppNotification(tx, {
      recipientId: actor.id,
      ticketId,
      type: NotificationType.TICKET_ASSIGNED,
      title: "Ticket pris en charge",
      body: readServerEnvironment().PRODUCT_PROFILE === "v1"
        ? claimStatus === TicketStatus.TO_QUALIFY
          ? `${updated.reference} vous est attribué pour qualification.`
          : `${updated.reference} est maintenant en traitement par vos soins.`
        : `${updated.reference} vous est maintenant affecté.`,
    });
    if (ticket.queue.managerId && ticket.queue.managerId !== actor.id) {
      await createInAppNotification(tx, {
        recipientId: ticket.queue.managerId,
        ticketId,
        type: NotificationType.TICKET_ASSIGNED,
        title: "Ticket pris en charge",
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
  if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) throw new DomainError("Un ticket terminé est conservé en lecture seule.", 409);
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
  if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.RESOLUTION_PENDING) {
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
