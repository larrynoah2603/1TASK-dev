import { canViewTicket } from "@/lib/access-control";
import { prisma } from "@/lib/db";
import { getUserContext, toAccessSubject } from "@/lib/server-auth";
import { accessTarget, ticketAccessInclude } from "@/lib/ticket-access";

/**
 * Revalidate the recipient's current ticket-reading rights immediately before
 * external delivery (Push/Email) and before serving protected Push photos.
 *
 * Crucially, a non-confidential ticket is not public: the recipient may have
 * lost a queue, active team membership or a scoped role after notification
 * creation. Use the same canViewTicket() policy as ticket detail requests.
 * Any missing record/disabled account/expired delegation fails closed.
 */
export async function notificationMayBeDelivered(notificationId: string, now = new Date()) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipient: { status: "ACTIVE", administrativelyDisabled: false } },
    select: { ticketId: true, recipientId: true },
  });
  if (!notification) return false;
  if (!notification.ticketId) return true;

  const [recipient, ticket] = await Promise.all([
    getUserContext(notification.recipientId),
    prisma.ticket.findUnique({
      where: { id: notification.ticketId },
      include: ticketAccessInclude,
    }),
  ]);
  if (!recipient || recipient.status !== "ACTIVE" || recipient.administrativelyDisabled || !ticket) {
    return false;
  }

  return canViewTicket(toAccessSubject(recipient), accessTarget(ticket, now));
}
