import { MessageVisibility, TicketEventType } from "@prisma/client";
import { canViewTicket } from "@/lib/access-control";
import { DomainError } from "@/lib/domain-error";
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
import { accessTarget, ticketAccessInclude, ticketSecurityInclude } from "@/lib/ticket-access";

const TICKET_MESSAGE_WINDOW = 200;
const TICKET_ASSIGNMENT_WINDOW = 100;
const TICKET_EVENT_WINDOW = 250;

export function getTicketForViewer(actor: UserContext, ticketId: string) {
  return measureServerOperation("tickets.detail", () => getTicketForViewerInternal(actor, ticketId));
}

async function getTicketForViewerInternal(actor: UserContext, ticketId: string) {
  actor = await requireCurrentActor(actor);
  const accessRecord = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  if (!accessRecord) throw new DomainError("Ticket introuvable.", 404);

  const subject = toAccessSubject(actor);
  if (!canViewTicket(subject, accessTarget(accessRecord))) {
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
  if (!ticket) throw new DomainError("Ticket introuvable.", 404);

  const latestAccess = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketAccessInclude });
  if (!latestAccess || !canViewTicket(subject, accessTarget(latestAccess))) {
    throw new AuthorizationError("Vous n’avez plus accès à ce ticket.");
  }
  const [worklogSummary, missionWorklogSummary] = await Promise.all([
    prisma.worklog.aggregate({ where: { ticketId }, _sum: { minutes: true }, _count: { _all: true } }),
    ticket.missionId
      ? prisma.worklog.aggregate({ where: { missionId: ticket.missionId }, _sum: { minutes: true } })
      : Promise.resolve({ _sum: { minutes: 0 } }),
  ]);
 const ticketDomain = toTicketDomain(ticket);


return {
  ...ticketDomain,

  messages: ticket.messages.toReversed(),

  assignments: ticket.assignments,

  events: ticket.events,

  worklogSummary: {
    minutes: worklogSummary._sum.minutes ?? 0,
    entries: worklogSummary._count._all,
  },

  missionWorklogMinutes:
    missionWorklogSummary._sum.minutes ?? 0,
};
}
