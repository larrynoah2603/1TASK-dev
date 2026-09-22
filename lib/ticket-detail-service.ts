import { MessageVisibility, TicketEventType } from "@prisma/client";
import { canViewTicket } from "@/lib/access-control";
import { DomainError } from "@/lib/domain-error";
import type { TicketDetailDomain } from "@/lib/domain/ticket";
import { canPostInternalMessage } from "@/lib/domain";
import { prisma } from "@/lib/db";
import {
  toTicketDomain,
} from "@/lib/mappers/ticket.mapper";
import { measureServerOperation } from "@/lib/performance";
import {
  AuthorizationError,
  hasPermission,
  requireCurrentActor,
  roleCodes,
  toAccessSubject,
  type UserContext,
} from "@/lib/server-auth";
import { accessTarget, ticketAccessInclude, ticketSecurityInclude, type AccessTicket } from "@/lib/ticket-access";

const TICKET_MESSAGE_WINDOW = 200;
const TICKET_ASSIGNMENT_WINDOW = 100;
const TICKET_EVENT_WINDOW = 250;

export function getTicketForViewer(actor: UserContext, ticketId: string) {
  return measureServerOperation("tickets.detail", () => getTicketForViewerInternal(actor, ticketId));
}

async function getTicketForViewerInternal(actor: UserContext, ticketId: string): Promise<TicketDetailDomain & { actionAccess: AccessTicket }> {
  actor = await requireCurrentActor(actor);
  console.log({ ticketId, userId: actor.id, operation: "ticket.detail.start" });
  const accessRecord = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  console.log({ found: Boolean(accessRecord), ticketId });
  if (!accessRecord) throw new DomainError("Ticket introuvable.", 404);

  const subject = toAccessSubject(actor);
  const allowed = canViewTicket(subject, accessTarget(accessRecord));
  console.log({ allowed, ticketId });
  if (!allowed) {
    throw new AuthorizationError("Vous n’avez pas accès à ce ticket.");
  }
  const canSeeInternalMessages = canPostInternalMessage(roleCodes(actor)) &&
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
        ...(canSeeInternalMessages ? {} : {
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
  console.log({ found: Boolean(ticket), ticketId, operation: "ticket.detail.content" });
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);

  // The final authorization recheck remains mandatory, but independent
  // worklog aggregates can run in parallel with it after the content snapshot
  // has been read. Nothing is returned until the recheck succeeds.
  const [latestAccess, worklogSummary, missionWorklogSummary] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude }),
    prisma.worklog.aggregate({ where: { ticketId }, _sum: { minutes: true }, _count: { _all: true } }),
    ticket.missionId
      ? prisma.worklog.aggregate({ where: { missionId: ticket.missionId }, _sum: { minutes: true } })
      : Promise.resolve({ _sum: { minutes: 0 } }),
  ]);
  if (!latestAccess || !canViewTicket(subject, accessTarget(latestAccess))) {
    throw new AuthorizationError("Vous n’avez plus accès à ce ticket.");
  }
  console.log({ ticketId, operation: "ticket.detail.worklogs.loaded" });
  const ticketDomain = toTicketDomain(ticket);

  return {
    ...ticketDomain,
    requester: ticket.requester,
    sourceDepartment: ticket.sourceDepartment,
    assignedTo: ticket.assignedTo,
    queue: ticket.queue,
    serviceCatalogItem: ticket.serviceCatalogItem,
    dossier: ticket.dossier,
    mission: ticket.mission,
    // Keep the Prisma result immutable without relying on the deployment
    // runtime implementing Array.prototype.toReversed.
    messages: [...ticket.messages].reverse(),
    assignments: ticket.assignments,
    events: ticket.events,
    worklogSummary: {
      minutes: worklogSummary._sum.minutes ?? 0,
      entries: worklogSummary._count._all,
    },
    missionWorklogMinutes: missionWorklogSummary._sum.minutes ?? 0,
    actionAccess: latestAccess,
  };
}
