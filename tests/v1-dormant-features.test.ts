import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";

const provider = vi.hoisted(() => ({ push: vi.fn(), email: vi.fn() }));
const outboxDb = vi.hoisted(() => ({
  $queryRaw: vi.fn().mockResolvedValue([]),
  outboxEvent: {
    updateMany: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/lib/push-notification-service", () => ({ deliverPushNotification: provider.push }));
vi.mock("@/lib/email-notification-service", () => ({ deliverEmailNotification: provider.email }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof outboxDb) => unknown) => callback(outboxDb)),
  },
}));

import { notify, queueEmailNotification } from "@/lib/notifications";
import { processOutboxBatch } from "@/lib/outbox";
import { withPublicApiV1 } from "@/lib/public-api";
import { GET as runOutboxJob } from "@/app/api/jobs/outbox/route";

describe("frontières serveur des fonctions optionnelles V1", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("PRODUCT_PROFILE", "v1");
    vi.stubEnv("WEB_PUSH_PUBLIC_KEY", "public-key");
    vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "private-key");
    vi.stubEnv("WEB_PUSH_SUBJECT", "mailto:notifications@example.com");
    vi.clearAllMocks();
    outboxDb.$queryRaw.mockResolvedValue([]);
  });

  it("active Web Push en V1 sans réactiver la livraison e-mail", async () => {
    const db = {
      notificationRule: { findMany: vi.fn().mockResolvedValue([]) },
      notificationPreference: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
      notification: {
        create: vi.fn(async ({ data }: { data: { channel: string } }) => ({
          id: data.channel === "PUSH" ? "push-1" : "in-app-1",
          channel: data.channel,
        })),
      },
      outboxEvent: { upsert: vi.fn().mockResolvedValue({ id: "outbox-1" }) },
    };

    const created = await notify(db as never, {
      recipientId: "user-1",
      type: NotificationType.SECURITY,
      severity: "CRITICAL",
      title: "Alerte",
      message: "Contrôle requis",
    });

    expect(created).toEqual([
      { id: "in-app-1", channel: "IN_APP" },
      { id: "push-1", channel: "PUSH" },
    ]);
    expect(db.outboxEvent.upsert).toHaveBeenCalledOnce();
    expect(db.outboxEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      type: "NOTIFICATION_PUSH_REQUESTED",
    }));

    await expect(queueEmailNotification(db as never, {
      recipientId: "user-1",
      type: NotificationType.SECURITY,
      title: "Alerte",
      body: "Corps",
    })).resolves.toBeNull();
    expect(db.notificationPreference.findUnique).not.toHaveBeenCalled();
  });

  it("active le worker outbox en V1 pour traiter le push", async () => {
    await expect(processOutboxBatch()).resolves.toEqual({ claimed: 0, processed: 0, failed: 0 });
    expect(provider.email).not.toHaveBeenCalled();
    expect(provider.push).not.toHaveBeenCalled();
  });

  it("conserve l’authentification du job outbox en V1", async () => {
    vi.stubEnv("CRON_SECRET", "test-job-secret");
    const denied = await runOutboxJob(new Request("http://localhost/api/jobs/outbox"));
    expect(denied.status).toBe(401);

    const accepted = await runOutboxJob(new Request("http://localhost/api/jobs/outbox", {
      headers: { authorization: "Bearer test-job-secret" },
    }));
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toMatchObject({
      success: true,
      result: { claimed: 0, processed: 0, failed: 0 },
    });
  });

  it("garde les autres fonctionnalités full désactivées", async () => {
    const handler = vi.fn().mockResolvedValue(Response.json({ status: "available" }));
    const response = await withPublicApiV1("/api/v1", handler)(new Request("http://localhost/api/v1"), {});
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "FEATURE_DISABLED" });
    expect(handler).not.toHaveBeenCalled();
  });
});
