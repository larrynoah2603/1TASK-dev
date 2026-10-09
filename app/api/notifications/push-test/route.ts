import { randomUUID } from "node:crypto";
import { NotificationChannel, NotificationStatus, NotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueOutboxEvent } from "@/lib/outbox";
import { errorResponse, httpErrorResponse } from "@/lib/http";
import { requireProductCapability } from "@/lib/product-policy.server";
import { requireSessionUserContext } from "@/lib/server-auth";

export async function POST() {
  try {
    requireProductCapability("pushNotifications");
    const actor = await requireSessionUserContext();
    const subscription = await prisma.pushSubscription.findFirst({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (!subscription) return httpErrorResponse("Aucun appareil Push enregistré pour ce compte.", 409);

    const deduplicationKey = `push-test:${actor.id}:${randomUUID()}`;
    const notification = await prisma.notification.create({
      data: {
        recipientId: actor.id,
        type: NotificationType.ADMINISTRATIVE_ACTION,
        severity: "INFO",
        entityType: "PUSH_TEST",
        entityId: actor.id,
        actionUrl: "/notifications",
        deduplicationKey,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
        title: "Test notification 1TASK",
        body: "Les notifications système fonctionnent sur cet appareil.",
      },
    });

    await enqueueOutboxEvent(prisma, {
      eventKey: `notification:${notification.id}:push`,
      type: "NOTIFICATION_PUSH_REQUESTED",
      aggregateType: "Notification",
      aggregateId: notification.id,
      payload: {
        notificationId: notification.id,
        channel: NotificationChannel.PUSH,
        recipientId: actor.id,
      },
    });

    return NextResponse.json({ ok: true, notificationId: notification.id }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
