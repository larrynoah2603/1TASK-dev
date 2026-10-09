import { Prisma } from "@prisma/client";
import { PrismaClient, NotificationChannel, NotificationStatus, NotificationType } from "@prisma/client";
import { enqueueOutboxEvent } from "@/lib/outbox";
import { getProductCapabilities } from "@/lib/product-policy.server";

type NotificationDb = Prisma.TransactionClient | PrismaClient;

export type InAppNotificationInput = {
  recipientId: string;
  ticketId?: string;
  type: NotificationType;
  title: string;
  body: string;
  severity?: import("@prisma/client").NotificationSeverity;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  deduplicationKey?: string;
};

async function notificationEnabled(db: NotificationDb, recipientId: string, type: NotificationType, channel: NotificationChannel) {
  const preference = await db.notificationPreference.findUnique({ where: { userId_eventType_channel: { userId: recipientId, eventType: type, channel } } });
  return preference?.enabled ?? true;
}


const defaultPushEventTypes = new Set<NotificationType>([
  NotificationType.QUEUE_NEW_TICKET,
  NotificationType.TICKET_ASSIGNED,
  NotificationType.INFORMATION_REQUESTED,
  NotificationType.TICKET_RESOLVED,
  NotificationType.TICKET_REOPENED,
  NotificationType.TICKET_MESSAGE,
  NotificationType.TICKET_STATUS_CHANGED,
  NotificationType.SLA_ALERT,
  NotificationType.SLA_BREACH,
  NotificationType.SLA_WARNING,
  NotificationType.SLA_BREACHED,
  NotificationType.CONFIDENTIAL_ACCESS,
  NotificationType.ADMINISTRATIVE_ACTION,
  NotificationType.ASSET_REQUEST,
  NotificationType.ASSET_APPROVED,
  NotificationType.ASSET_REJECTED,
  NotificationType.ADMIN_ACTION,
  NotificationType.SECURITY,
]);

export function shouldPushByDefault(type: NotificationType) {
  return defaultPushEventTypes.has(type);
}

async function createPushMirrors(db: NotificationDb, inputs: InAppNotificationInput[]) {
  const capabilities = getProductCapabilities();
  if (!capabilities.pushNotifications) return;
  const candidates = inputs.filter((input) => shouldPushByDefault(input.type));
  if (!candidates.length) return;

  const recipientIds = [...new Set(candidates.map((input) => input.recipientId))];
  const eventTypes = [...new Set(candidates.map((input) => input.type))];
  const preferences = await db.notificationPreference.findMany({
    where: {
      userId: { in: recipientIds },
      eventType: { in: eventTypes },
      channel: NotificationChannel.PUSH,
    },
    select: { userId: true, eventType: true, enabled: true },
  });
  const disabled = new Set(
    preferences
      .filter((preference) => !preference.enabled)
      .map((preference) => `${preference.userId}:${preference.eventType}`),
  );

  for (const input of candidates) {
    const mandatory = input.type === NotificationType.SECURITY || input.severity === "CRITICAL";
    if (!mandatory && disabled.has(`${input.recipientId}:${input.type}`)) continue;
    try {
      const notification = await db.notification.create({
        data: {
          recipientId: input.recipientId,
          ticketId: input.ticketId,
          type: input.type,
          title: input.title,
          body: input.body,
          severity: input.severity,
          entityType: input.entityType,
          entityId: input.entityId,
          actionUrl: input.actionUrl,
          deduplicationKey: input.deduplicationKey,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.PENDING,
        },
      });
      await enqueueOutboxEvent(db, {
        eventKey: `notification:${notification.id}:push`,
        type: "NOTIFICATION_PUSH_REQUESTED",
        aggregateType: "Notification",
        aggregateId: notification.id,
        payload: {
          notificationId: notification.id,
          channel: NotificationChannel.PUSH,
          recipientId: input.recipientId,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
}

export async function createInAppNotification(db: NotificationDb, input: InAppNotificationInput) {
  let inAppNotification = null;
  if (await notificationEnabled(db, input.recipientId, input.type, NotificationChannel.IN_APP)) {
    inAppNotification = await db.notification.create({
      data: {
        recipientId: input.recipientId,
        ticketId: input.ticketId,
        type: input.type,
        title: input.title,
        body: input.body,
        severity: input.severity,
        entityType: input.entityType,
        entityId: input.entityId,
        actionUrl: input.actionUrl,
        deduplicationKey: input.deduplicationKey,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
      },
    });
  }
  await createPushMirrors(db, [input]);
  return inAppNotification;
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
      severity: input.severity,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
      deduplicationKey: input.deduplicationKey,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
    }));
  if (rows.length) await db.notification.createMany({ data: rows });
  await createPushMirrors(db, inputs);
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
  if (!getProductCapabilities().externalEmailDelivery) return null;
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

export type NotificationDispatchInput = {
  recipientId: string;
  type: NotificationType;
  severity: import("@prisma/client").NotificationSeverity;
  title: string;
  message: string;
  ticketId?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  deduplicationKey?: string;
};

export function defaultChannelsForSeverity(severity: import("@prisma/client").NotificationSeverity): NotificationChannel[] {
  if (severity === "CRITICAL") return [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL];
  if (severity === "WARNING") return [NotificationChannel.IN_APP, NotificationChannel.PUSH];
  return [NotificationChannel.IN_APP];
}

export function defaultChannelsForNotification(
  type: NotificationType,
  severity: import("@prisma/client").NotificationSeverity,
): NotificationChannel[] {
  const channels = defaultChannelsForSeverity(severity);
  if (!shouldPushByDefault(type) || channels.includes(NotificationChannel.PUSH)) return channels;
  return [NotificationChannel.IN_APP, NotificationChannel.PUSH, ...channels.filter((channel) => channel !== NotificationChannel.IN_APP)];
}

/** Central notification dispatcher. Business code never contacts push/email providers directly. */
export async function notify(db: NotificationDb, input: NotificationDispatchInput) {
  const capabilities = getProductCapabilities();
  const configured = await db.notificationRule.findMany({ where: { eventType: input.type, isActive: true }, select: { channel: true } });
  const channels = (configured.length ? [...new Set(configured.map((rule) => rule.channel))] : defaultChannelsForNotification(input.type, input.severity))
    .filter((channel) => channel === NotificationChannel.IN_APP ||
      (channel === NotificationChannel.EMAIL && capabilities.externalEmailDelivery) ||
      (channel === NotificationChannel.PUSH && capabilities.pushNotifications));
  const mandatory = input.type === NotificationType.SECURITY || input.severity === "CRITICAL";
  const preferences = mandatory ? [] : await db.notificationPreference.findMany({ where: { userId: input.recipientId, eventType: input.type, channel: { in: channels } }, select: { channel: true, enabled: true } });
  const disabled = new Set(preferences.filter((item) => !item.enabled).map((item) => item.channel));
  const created = [];
  for (const channel of channels.filter((item) => mandatory || !disabled.has(item))) {
    try {
      const notification = await db.notification.create({ data: {
        recipientId: input.recipientId, ticketId: input.ticketId, type: input.type, severity: input.severity,
        title: input.title, body: input.message, entityType: input.entityType, entityId: input.entityId,
        actionUrl: input.actionUrl, deduplicationKey: input.deduplicationKey, channel, status: NotificationStatus.PENDING,
      } });
      created.push(notification);
      if (channel !== NotificationChannel.IN_APP) await enqueueOutboxEvent(db, {
        eventKey: `notification:${notification.id}:${channel.toLowerCase()}`, type: `NOTIFICATION_${channel}_REQUESTED`,
        aggregateType: "Notification", aggregateId: notification.id,
        payload: { notificationId: notification.id, channel, recipientId: input.recipientId },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
  return created;
}
