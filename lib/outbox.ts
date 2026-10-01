import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readServerEnvironment } from "@/lib/env";
import { deliverPushNotification } from "@/lib/push-notification-service";
import { deliverEmailNotification } from "@/lib/email-notification-service";

type OutboxDb = Prisma.TransactionClient | PrismaClient;

export async function deliverInternalNotificationEvent(type: string, payload: { notificationId?: string }) {
  if (!payload.notificationId) throw new Error("Notification id is missing");
  if (type === "NOTIFICATION_PUSH_REQUESTED") return deliverPushNotification(payload.notificationId);
  if (type === "NOTIFICATION_EMAIL_REQUESTED") return deliverEmailNotification(payload.notificationId);
  return null;
}

export async function enqueueOutboxEvent(db: OutboxDb, input: {
  eventKey: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.InputJsonValue;
}) {
  return db.outboxEvent.upsert({ where: { eventKey: input.eventKey }, create: input, update: {} });
}

export async function processOutboxBatch(now = new Date()) {
  const batchSize = readServerEnvironment().OUTBOX_BATCH_SIZE;
  const leaseBefore = new Date(now.getTime() - 5 * 60_000);
  const claimed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT "id" FROM "OutboxEvent"
      WHERE "availableAt" <= ${now}
        AND ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "lockedAt" < ${leaseBefore}))
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    `);
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    await tx.outboxEvent.updateMany({ where: { id: { in: ids } }, data: { status: "PROCESSING", lockedAt: now } });
    return tx.outboxEvent.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: "asc" } });
  });
  let processed = 0;
  let failed = 0;
  for (const event of claimed) {
    try {
      const environment = readServerEnvironment();
      if (event.type === "NOTIFICATION_PUSH_REQUESTED" || event.type === "NOTIFICATION_EMAIL_REQUESTED") {
        const payload = event.payload as { notificationId?: string };
        await deliverInternalNotificationEvent(event.type, payload);
        await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), lockedAt: null, lastError: null } });
        processed += 1;
        continue;
      }
      const endpoint = environment.OUTBOX_DELIVERY_URL;
      if (!endpoint) throw new Error("OUTBOX_DELIVERY_URL is not configured");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": event.eventKey, ...(environment.OUTBOX_DELIVERY_TOKEN ? { Authorization: `Bearer ${environment.OUTBOX_DELIVERY_TOKEN}` } : {}) },
        body: JSON.stringify({ id: event.id, type: event.type, aggregateType: event.aggregateType, aggregateId: event.aggregateId, payload: event.payload }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`delivery returned ${response.status}`);
      await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), lockedAt: null, lastError: null } });
      processed += 1;
    } catch (error) {
      const attempts = event.attempts + 1;
      const providerDelay = typeof error === "object" && error && "retryAfterMs" in error && typeof error.retryAfterMs === "number" ? error.retryAfterMs : 0;
      const retryDelay = Math.max(providerDelay, Math.min(3_600_000, 1_000 * 2 ** attempts));
      console.warn("[outbox] delivery failed", {
        eventId: event.id,
        eventType: event.type,
        attempt: attempts,
        retryInMs: retryDelay,
        error: error instanceof Error ? error.message : "delivery failed",
      });
      await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: attempts >= 10 ? "DEAD" : "PENDING", attempts, lockedAt: null, availableAt: new Date(Date.now() + retryDelay), lastError: error instanceof Error ? error.message.slice(0, 500) : "delivery failed" } });
      if (attempts >= 10 && event.type === "NOTIFICATION_EMAIL_REQUESTED") {
        const payload = event.payload as { notificationId?: string };
        if (payload.notificationId) await prisma.notification.updateMany({ where: { id: payload.notificationId, status: "PENDING" }, data: { status: "FAILED" } });
      }
      failed += 1;
    }
  }
  return { claimed: claimed.length, processed, failed };
}

export async function replayOutboxEvent(id: string) {
  return prisma.outboxEvent.update({ where: { id, status: "DEAD" }, data: { status: "PENDING", attempts: 0, availableAt: new Date(), lockedAt: null, lastError: null } });
}
