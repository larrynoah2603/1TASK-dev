import type { Prisma } from "@prisma/client";
import { NotificationChannel, NotificationStatus, NotificationType } from "@prisma/client";

type TransactionDb = Prisma.TransactionClient;

async function notificationEnabled(db: TransactionDb, recipientId: string, type: NotificationType, channel: NotificationChannel) {
  const preference = await db.notificationPreference.findUnique({ where: { userId_eventType_channel: { userId: recipientId, eventType: type, channel } } });
  return preference?.enabled ?? true;
}

export async function createInAppNotification(
  db: TransactionDb,
  input: {
    recipientId: string;
    ticketId?: string;
    type: NotificationType;
    title: string;
    body: string;
  },
) {
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

export async function queueEmailNotification(
  db: TransactionDb,
  input: {
    recipientId: string;
    ticketId?: string;
    type: NotificationType;
    title: string;
    body: string;
  },
) {
  if (!(await notificationEnabled(db, input.recipientId, input.type, NotificationChannel.EMAIL))) return null;
  return db.notification.create({
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
}
