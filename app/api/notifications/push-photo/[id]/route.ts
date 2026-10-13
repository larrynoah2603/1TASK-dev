import { NotificationChannel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notificationMayBeDelivered } from "@/lib/notification-authorization";
import { decodePushRequesterPhoto } from "@/lib/push-requester-photo";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

/**
 * The push payload carries only this same-origin URL, never photo bytes.
 * No one can read an avatar using a notification ID other than its owner.
 * A confidential ticket remains anonymous even if a push is delayed.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const notification = await prisma.notification.findFirst({
      where: { id, recipientId: actor.id, channel: NotificationChannel.PUSH },
      select: { ticketId: true },
    });
    if (!notification?.ticketId || !(await notificationMayBeDelivered(id))) {
      return new Response(null, { status: 404, headers: noStoreHeaders });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: notification.ticketId },
      select: {
        confidential: true,
        requester: { select: { image: true } },
      },
    });
    if (!ticket || ticket.confidential) {
      return new Response(null, { status: 404, headers: noStoreHeaders });
    }
    const photo = decodePushRequesterPhoto(ticket.requester.image);
    if (!photo) return new Response(null, { status: 404, headers: noStoreHeaders });

    return new Response(Uint8Array.from(photo.bytes).buffer, {
      status: 200,
      headers: { ...noStoreHeaders, "Content-Type": photo.mime },
    });
  } catch {
    // Do not expose an identity's photo or notification existence on auth errors.
    return new Response(null, { status: 404, headers: noStoreHeaders });
  }
}
