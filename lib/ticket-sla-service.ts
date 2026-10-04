import { TicketEventType, TicketStatus } from "@prisma/client";
import { appendAuditLog } from "@/lib/audit";
import { canManageQueue, canViewTicket } from "@/lib/access-control";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/domain-error";
import { AuthorizationError, hasPermission, requireCurrentActor, toAccessSubject, type UserContext } from "@/lib/server-auth";
import { accessTarget, ticketAccessInclude } from "@/lib/ticket-access";
import { slaExceptionSchema, type SlaExceptionInput } from "@/lib/validation";

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
  if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) throw new DomainError("Un ticket clôturé ne peut pas recevoir de dérogation SLA.", 409);
  const extension = parsed.addedMinutes * 60_000;
  const firstResponseDueAt = ticket.firstResponseDueAt ? new Date(ticket.firstResponseDueAt.getTime() + extension) : null;
  const resolutionDueAt = ticket.resolutionDueAt ? new Date(ticket.resolutionDueAt.getTime() + extension) : null;
  return prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticketId }, data: { firstResponseDueAt, resolutionDueAt } });
    const created = await tx.slaException.create({ data: { ticketId, createdById: actor.id, reason: parsed.reason, addedMinutes: parsed.addedMinutes, firstResponseDueAt, resolutionDueAt } });
    await tx.ticketEvent.create({ data: { ticketId, actorId: actor.id, queueId: ticket.queueId, eventType: TicketEventType.SLA_EXCEPTION_CREATED, metadata: { addedMinutes: parsed.addedMinutes, reason: parsed.reason, firstResponseDueAt, resolutionDueAt } } });
    await appendAuditLog(tx, {
      actorId: actor.id, action: "SLA_EXCEPTION_CREATED", objectType: "Ticket", objectId: ticketId,
      oldValue: { firstResponseDueAt: ticket.firstResponseDueAt, resolutionDueAt: ticket.resolutionDueAt },
      newValue: { addedMinutes: parsed.addedMinutes, firstResponseDueAt, resolutionDueAt }, reason: parsed.reason,
    });
    return created;
  });
}
