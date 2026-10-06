import { after } from "next/server";
import { NotificationType, Prisma, RoleCode, TicketEventType, TicketStatus } from "@prisma/client";
import { canViewTicket } from "@/lib/access-control";
import { appendAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  calculatePriorityFromImpactUrgency,
  canConfirmResolution,
  canReopenResolution,
  canTransitionStatus,
  isStaffRole,
  v1RequesterAllowedNextStatuses,
} from "@/lib/domain";
import { DomainError } from "@/lib/domain-error";
import { AuthorizationError, hasPermission, requireCurrentActor, roleCodes, toAccessSubject, type UserContext } from "@/lib/server-auth";
import { createInAppNotifications } from "@/lib/notifications";
import { logServerError } from "@/lib/http";
import { automaticAssignmentOutcome, chooseAutoAssignee, recordAssignment, shouldAutomaticallyAssign } from "@/lib/ticket-assignment-service";
import { accessTarget, ticketAccessInclude, ticketSecurityInclude } from "@/lib/ticket-access";
import { calculateAutomaticClosureDeadline, calculateSlaDeadlines } from "@/lib/sla";
import { queueWorkerIds } from "@/lib/ticket-notification-service";
import { readServerEnvironment } from "@/lib/env";
import { V1_CONFIGURATION_ID } from "@/lib/triage-configuration";
import { resolveProductCapabilities } from "@/lib/product-policy";
import {
  ticketQualificationSchema,
  transitionTicketSchema,
  type TicketQualificationInput,
  type TransitionTicketInput,
} from "@/lib/validation";

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

export function isAuthorizedGlobalTriageOrigin(originQueueId: string, configuredQueueId: string | null | undefined, hasScopedCapability: boolean) {
  return Boolean(configuredQueueId && originQueueId === configuredQueueId && hasScopedCapability);
}

async function qualificationScope(actor: UserContext, ticket: { queueId: string; queue: { departmentId: string } }, target: ReturnType<typeof accessTarget>) {
  const configured = await prisma.v1Configuration.findUnique({
    where: { id: V1_CONFIGURATION_ID },
    select: { globalTriageService: { select: { queueId: true } } },
  });
  const configuredQueueId = configured?.globalTriageService?.queueId;
  const globalTriage = configuredQueueId === ticket.queueId;
  const crossDepartment = isAuthorizedGlobalTriageOrigin(
    ticket.queueId,
    configuredQueueId,
    hasPermission(actor, "ticket:qualify:global-triage", target),
  );
  return { globalTriage, crossDepartment, departmentId: ticket.queue.departmentId };
}

export async function listQualificationDestinationServices(actor: UserContext, ticketId: string) {
  actor = await requireCurrentActor(actor);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  const target = accessTarget(ticket);
  if (!canViewTicket(toAccessSubject(actor), target) || !hasPermission(actor, "ticket:update", target) || !roleCodes(actor).some(isStaffRole)) {
    throw new AuthorizationError("La qualification n’est pas autorisée dans ce périmètre.");
  }
  const scope = await qualificationScope(actor, ticket, target);
  return prisma.serviceCatalogItem.findMany({
    where: {
      isActive: true,
      provisionedTriageDepartmentId: null,
      queue: {
        isActive: true,
        department: { isActive: true },
        ...(scope.crossDepartment ? {} : { departmentId: scope.departmentId }),
      },
      sla: { isActive: true, calendar: { isActive: true } },
    },
    select: { id: true, name: true, category: true, queue: { select: { id: true, name: true, department: { select: { id: true, name: true } } } } },
    orderBy: [{ name: "asc" }],
  });
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
  if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) throw new DomainError("Un ticket terminé ne peut plus être qualifié.", 409);
  const scope = await qualificationScope(actor, ticket, target);

  const selectedService = parsed.serviceCatalogItemId
    ? await prisma.serviceCatalogItem.findFirst({
        where: {
          id: parsed.serviceCatalogItemId,
          isActive: true,
          provisionedTriageDepartmentId: null,
          queue: { isActive: true, ...(scope.crossDepartment ? {} : { departmentId: ticket.queue.departmentId }), department: { isActive: true } },
        },
        include: { queue: true, sla: { include: { calendar: { include: { holidays: true } } } } },
      })
    : null;
  if (parsed.serviceCatalogItemId && !selectedService) {
    throw new AuthorizationError("Le service de destination est indisponible ou hors du périmètre de qualification.");
  }
  if (selectedService && (!selectedService.sla || !selectedService.sla.isActive || !selectedService.sla.calendar.isActive)) {
    throw new DomainError("Le service de destination n’a pas de SLA actif configuré.", 422);
  }

  const v1Profile = readServerEnvironment().PRODUCT_PROFILE === "v1";
  const productCapabilities = resolveProductCapabilities(readServerEnvironment().PRODUCT_PROFILE);
  const priority = parsed.priority ?? (v1Profile && selectedService ? selectedService.priorityDefault : calculatePriorityFromImpactUrgency(parsed.impact, parsed.urgency));
  const now = new Date();
  const deadlines = selectedService?.sla
    ? calculateSlaDeadlines(now, selectedService.sla, {
        ...selectedService.sla.calendar,
        holidays: selectedService.sla.calendar.holidays.map((holiday) => holiday.date),
      })
    : null;

  return prisma.$transaction(async (tx) => {
    const rerouted = Boolean(selectedService && (selectedService.id !== ticket.serviceCatalogItemId || selectedService.queueId !== ticket.queueId));
    let nextStatus = selectedService ? TicketStatus.TO_ASSIGN : ticket.status;
    let assignedToId: string | null | undefined = selectedService ? null : undefined;
    let assignee: Awaited<ReturnType<typeof chooseAutoAssignee>> = null;
    if (selectedService && shouldAutomaticallyAssign(productCapabilities, selectedService.queue.autoAssignment)) {
      assignee = await chooseAutoAssignee(tx, selectedService.queueId, selectedService.keywords);
      if (assignee) {
        const outcome = automaticAssignmentOutcome(assignee.userId, TicketStatus.TO_ASSIGN);
        nextStatus = outcome.status;
        assignedToId = outcome.assignedToId;
      }
    }
    const changed = await tx.ticket.updateMany({
      where: { id: ticketId, status: ticket.status, queueId: ticket.queueId },
      data: {
        impact: parsed.impact,
        urgency: parsed.urgency,
        priority,
        priorityOverrideReason: parsed.priority ? parsed.reason : null,
        legalDueAt: parsed.legalDueAt ?? null,
        ...(selectedService && deadlines ? {
          serviceCatalogItemId: selectedService.id,
          queueId: selectedService.queueId,
          type: selectedService.ticketType,
          category: selectedService.category,
          slaId: selectedService.sla?.id,
          firstResponseDueAt: deadlines.firstResponseDueAt,
          resolutionDueAt: deadlines.resolutionDueAt,
          status: nextStatus,
          assignedToId,
          firstRespondedAt: null,
          resolvedAt: null,
          slaPausedAt: null,
          totalPausedMinutes: 0,
        } : {}),
      },
    });
    if (changed.count !== 1) throw new DomainError("Le ticket a changé avant la qualification. Rechargez la fiche puis réessayez.", 409);
    const updated = await tx.ticket.findUnique({ where: { id: ticketId }, include: ticketSecurityInclude });
    if (!updated) throw new DomainError("Ticket introuvable après la qualification.", 404);
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: actor.id,
        queueId: updated.queue.id,
        eventType: TicketEventType.QUALIFIED,
        fromStatus: ticket.status,
        toStatus: updated.status,
        metadata: {
          impact: parsed.impact, urgency: parsed.urgency, priority, legalDueAt: parsed.legalDueAt, reason: parsed.reason,
          routingMode: selectedService ? "CATALOG" : undefined,
          catalogItemId: selectedService?.id,
          catalogCode: selectedService?.code,
          routedDepartmentId: selectedService?.queue.departmentId,
          routedQueueId: selectedService?.queueId,
          slaId: selectedService?.sla?.id,
        },
      },
    });
    if (rerouted) {
      await tx.ticketEvent.create({
        data: {
          ticketId, actorId: actor.id, queueId: selectedService?.queueId,
          eventType: TicketEventType.QUEUE_CHANGED, fromStatus: ticket.status, toStatus: updated.status,
          metadata: { previousQueueId: ticket.queueId, queueId: selectedService?.queueId, serviceCatalogItemId: selectedService?.id, reason: parsed.reason },
        },
      });
    }
    if (selectedService && assignee) {
      await recordAssignment(tx, {
        ticketId, queueId: selectedService.queueId, previousAssigneeId: ticket.assignedToId,
        newAssigneeId: assignee.userId, assignedById: actor.id, reason: "Auto-affectation après qualification",
        fromStatus: ticket.status, toStatus: TicketStatus.ASSIGNED, assignmentMode: "AUTO",
      });
    }
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: rerouted ? "TICKET_QUALIFIED_AND_ROUTED" : "TICKET_QUALIFIED",
      objectType: "Ticket",
      objectId: ticketId,
      oldValue: { impact: ticket.impact, urgency: ticket.urgency, priority: ticket.priority, legalDueAt: ticket.legalDueAt, queueId: ticket.queueId, serviceCatalogItemId: ticket.serviceCatalogItemId, slaId: ticket.slaId },
      newValue: { impact: parsed.impact, urgency: parsed.urgency, priority, legalDueAt: parsed.legalDueAt ?? null, queueId: updated.queue.id, serviceCatalogItemId: updated.serviceCatalogItem.id, slaId: selectedService?.sla?.id ?? ticket.slaId, status: updated.status },
      reason: parsed.reason,
    });
    if (selectedService) {
      const recipientIds = assignee
        ? [assignee.userId]
        : await queueWorkerIds(tx, selectedService.queueId);
      await createInAppNotifications(tx, [...new Set(recipientIds)]
        .filter((recipientId) => recipientId !== actor.id)
        .map((recipientId) => ({
          recipientId,
          ticketId,
          type: assignee ? NotificationType.TICKET_ASSIGNED : NotificationType.QUEUE_NEW_TICKET,
          title: assignee ? "Nouveau ticket affecté" : "Ticket qualifié dans votre file",
          body: assignee
            ? `${updated.reference} vous a été affecté après qualification.`
            : `${updated.reference} a été qualifié et routé vers ${updated.queue.name}.`,
        })));
    }
    const stillVisible = canViewTicket(toAccessSubject(actor), accessTarget(updated));
    return stillVisible ? updated : { id: updated.id, status: updated.status, accessRetained: false as const };
  }, { maxWait: 10_000, timeout: 15_000 });
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
      sla: { include: { calendar: { include: { holidays: true } } } },
    },
  });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);
  if (!canViewTicket(toAccessSubject(actor), accessTarget(ticket))) {
    throw new AuthorizationError("Vous n’avez pas accès à ce ticket.");
  }

  const requesterAction = actor.id === ticket.requesterId;
  const v1RequesterView = readServerEnvironment().PRODUCT_PROFILE === "v1" && requesterAction;
  if (!hasPermission(actor, "ticket:update")) {
    throw new AuthorizationError("La permission de faire évoluer ce ticket n’est pas accordée.");
  }
  const transitionAllowed = v1RequesterView
    ? v1RequesterAllowedNextStatuses(ticket.status).includes(parsed.status)
    : canTransitionStatus(ticket.status, parsed.status, roleCodes(actor), requesterAction);
  if (!transitionAllowed) {
    throw new AuthorizationError("Cette transition n’est pas autorisée pour votre rôle ou ce ticket.");
  }
  const actorRoles = roleCodes(actor);
  const transitionTarget = accessTarget(ticket);
  const isFunctionalAdminActor = actorRoles.includes(RoleCode.FUNCTIONAL_ADMIN);
  if (parsed.status === TicketStatus.CANCELLED && !hasPermission(actor, "ticket:cancel", transitionTarget) && !isFunctionalAdminActor) {
    throw new AuthorizationError("La permission d’annuler ce ticket n’est pas accordée.");
  }
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
    parsed.status !== TicketStatus.CANCELLED &&
    ticket.assignedToId !== actor.id
  ) {
    throw new AuthorizationError("Un agent ne peut traiter que le ticket qui lui est affecté.");
  }
  const administrativeOverride = isFunctionalAdministrator(actor) && !v1RequesterView;
  if (administrativeOverride) requireAdministrativeReason(actor, parsed.reason);
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
  let automaticClosureDueAt: Date | undefined;
  if (parsed.status === TicketStatus.RESOLUTION_PENDING) {
    const calendar = ticket.sla?.calendar;
    if (!ticket.sla?.isActive || !calendar?.isActive) {
      throw new DomainError("La clôture automatique nécessite un SLA et un calendrier actifs.", 422);
    }
    try {
      automaticClosureDueAt = calculateAutomaticClosureDeadline(now, {
        workingDays: calendar.workingDays,
        workdayStartMinute: calendar.workdayStartMinute,
        workdayEndMinute: calendar.workdayEndMinute,
        timezone: calendar.timezone,
        holidays: calendar.holidays.map((holiday) => holiday.date),
      });
    } catch {
      throw new DomainError("Le calendrier SLA est invalide pour calculer la date de clôture automatique.", 422);
    }
  }
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
    autoClosureDueAt: parsed.status === TicketStatus.RESOLUTION_PENDING
      ? automaticClosureDueAt
      : parsed.status === TicketStatus.REOPENED || parsed.status === TicketStatus.CLOSED
        ? null
        : undefined,
    cancelledAt: parsed.status === TicketStatus.CANCELLED ? now : undefined,
    cancellationReason: parsed.status === TicketStatus.CANCELLED ? parsed.reason : undefined,
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
    const eventType = parsed.status === TicketStatus.CANCELLED
      ? TicketEventType.CANCELLED
      : parsed.status === TicketStatus.REOPENED
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
          autoClosureDueAt: updated.autoClosureDueAt,
        },
      },
    });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: administrativeOverride ? "ADMINISTRATIVE_WORKFLOW_OVERRIDE" : parsed.status === TicketStatus.CANCELLED ? "TICKET_CANCELLED" : "TICKET_STATUS_CHANGED",
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
        autoClosureDueAt: updated.autoClosureDueAt,
        cancelledAt: updated.cancelledAt,
        cancellationReason: updated.cancellationReason,
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
        logServerError("ticket_transition_notification_failed", notificationError, { ticketId });
      }
    });
  }

  return updated;
}
