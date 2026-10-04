import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";

const provider = vi.hoisted(() => ({ push: vi.fn(), email: vi.fn() }));
vi.mock("@/lib/push-notification-service", () => ({ deliverPushNotification: provider.push }));
vi.mock("@/lib/email-notification-service", () => ({ deliverEmailNotification: provider.email }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: vi.fn() } }));

import { notify, queueEmailNotification } from "@/lib/notifications";
import { processOutboxBatch } from "@/lib/outbox";
import { withPublicApiV1 } from "@/lib/public-api";
import { GET as runOutboxJob } from "@/app/api/jobs/outbox/route";

describe("frontières serveur des fonctions dormantes V1", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("PRODUCT_PROFILE", "v1");
    vi.clearAllMocks();
  });

  it("crée encore une notification in-app sans backlog externe", async () => {
    const db = {
      notificationRule: { findMany: vi.fn().mockResolvedValue([]) },
      notificationPreference: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
      notification: { create: vi.fn().mockResolvedValue({ id: "in-app-1", channel: "IN_APP" }) },
      outboxEvent: { upsert: vi.fn() },
    };
    const created = await notify(db as never, {
      recipientId: "user-1", type: NotificationType.SECURITY, severity: "CRITICAL",
      title: "Alerte", message: "Contrôle requis",
    });
    expect(created).toEqual([{ id: "in-app-1", channel: "IN_APP" }]);
    expect(db.notification.create).toHaveBeenCalledOnce();
    expect(db.outboxEvent.upsert).not.toHaveBeenCalled();

    await expect(queueEmailNotification(db as never, {
      recipientId: "user-1", type: NotificationType.SECURITY, title: "Alerte", body: "Corps",
    })).resolves.toBeNull();
    expect(db.notificationPreference.findUnique).not.toHaveBeenCalled();
  });

  it("laisse intactes les anciennes lignes outbox et n'initialise aucun fournisseur", async () => {
    await expect(processOutboxBatch()).resolves.toEqual({ claimed: 0, processed: 0, failed: 0, disabled: true });
    expect(provider.email).not.toHaveBeenCalled();
    expect(provider.push).not.toHaveBeenCalled();
  });

  it("conserve l’authentification du job outbox avant son no-op V1", async () => {
    vi.stubEnv("CRON_SECRET", "test-job-secret");
    const denied = await runOutboxJob(new Request("http://localhost/api/jobs/outbox"));
    expect(denied.status).toBe(403);

    const accepted = await runOutboxJob(new Request("http://localhost/api/jobs/outbox", {
      headers: { authorization: "Bearer test-job-secret" },
    }));
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toMatchObject({
      success: true,
      result: { claimed: 0, processed: 0, failed: 0, disabled: true },
    });
  });

  it("désactive aussi le handler racine API v1 via le garde commun", async () => {
    const handler = vi.fn().mockResolvedValue(Response.json({ status: "available" }));
    const response = await withPublicApiV1("/api/v1", handler)(new Request("http://localhost/api/v1"), {});
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "FEATURE_DISABLED" });
    expect(handler).not.toHaveBeenCalled();
  });
});
