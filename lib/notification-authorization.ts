import { prisma } from "@/lib/db";

/** Revalidates account and named ticket access immediately before an external
 * delivery. Revocation/expiry therefore wins even when an outbox row was
 * queued earlier. */
export async function notificationMayBeDelivered(notificationId: string, now = new Date()) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipient: { status: "ACTIVE", administrativelyDisabled: false } },
    select: { ticketId: true, recipientId: true },
  });
  if (!notification) return false;
  if (!notification.ticketId) return true;
  return Boolean(await prisma.ticket.findFirst({
    where: {
      id: notification.ticketId,
      OR: [
        { confidential: false },
        { requesterId: notification.recipientId },
        { accessList: { some: { userId: notification.recipientId, OR: [
          { delegationId: null },
          { delegation: { startsAt: { lte: now }, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } },
        ] } } },
      ],
    },
    select: { id: true },
  }));
}
