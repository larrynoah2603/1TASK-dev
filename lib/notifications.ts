import type { Prisma } from "@prisma/client";
import { PrismaClient, NotificationChannel, NotificationStatus, NotificationType } from "@prisma/client";
import { enqueueOutboxEvent } from "@/lib/outbox";

type NotificationDb = Prisma.TransactionClient | PrismaClient;

export type InAppNotificationInput = {
  recipientId: string;
  ticketId?: string;
  type: NotificationType;
  title: string;
  body: string;
};

async function notificationEnabled(db: NotificationDb, recipientId: string, type: NotificationType, channel: NotificationChannel) {
  const preference = await db.notificationPreference.findUnique({ where: { userId_eventType_channel: { userId: recipientId, eventType: type, channel } } });
  return preference?.enabled ?? true;
}

export async function createInAppNotification(db: NotificationDb, input: InAppNotificationInput) {
  if (!(await notificationEnabled(db, input.recipientId, input.type, NotificationChannel.IN_APP))) return null;
  return db.notification.create({
    data: {
      recipientId: input.recipientId,
      ticketId: input.ticketId,
      type: input.type,
      title: input.title,
      body: input.body,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
    },
  });
}

export async function createInAppNotifications(db: NotificationDb, inputs: InAppNotificationInput[]) {
  if (!inputs.length) return;
  const recipientIds = [...new Set(inputs.map((input) => input.recipientId))];
  const eventTypes = [...new Set(inputs.map((input) => input.type))];
  const preferences = await db.notificationPreference.findMany({
    where: {
      userId: { in: recipientIds },
      eventType: { in: eventTypes },
      channel: NotificationChannel.IN_APP,
    },
    select: { userId: true, eventType: true, enabled: true },
  });
  const disabled = new Set(
    preferences.filter((preference) => !preference.enabled).map((preference) => `${preference.userId}:${preference.eventType}`),
  );
  const rows = inputs
    .filter((input) => !disabled.has(`${input.recipientId}:${input.type}`))
    .map((input) => ({
      recipientId: input.recipientId,
      ticketId: input.ticketId,
      type: input.type,
      title: input.title,
      body: input.body,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
    }));
  if (rows.length) await db.notification.createMany({ data: rows });
}

export async function queueEmailNotification(
  db: NotificationDb,
  input: {
    recipientId: string;
    ticketId?: string;
    type: NotificationType;
    title: string;
    body: string;
  },
) {
  if (!(await notificationEnabled(db, input.recipientId, input.type, NotificationChannel.EMAIL))) return null;
  const notification = await db.notification.create({
    data: {
      recipientId: input.recipientId,
      ticketId: input.ticketId,
      type: input.type,
      title: input.title,
      body: input.body,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
    },
  });
  await enqueueOutboxEvent(db, {
    eventKey: `notification:${notification.id}:email`,
    type: "NOTIFICATION_EMAIL_REQUESTED",
    aggregateType: "Notification",
    aggregateId: notification.id,
    payload: { notificationId: notification.id, recipientId: input.recipientId, ticketId: input.ticketId ?? null, type: input.type, title: input.title, body: input.body },
  });
  return notification;
}
