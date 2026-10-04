import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const delivery = vi.hoisted(() => ({ push: vi.fn(), email: vi.fn() }));
vi.mock("@/lib/push-notification-service", () => ({ deliverPushNotification: delivery.push }));
vi.mock("@/lib/email-notification-service", () => ({ deliverEmailNotification: delivery.email }));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { deliverInternalNotificationEvent } from "@/lib/outbox";

describe("routage interne de l'outbox de notifications", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("PRODUCT_PROFILE", "full");
    vi.clearAllMocks();
  });

  it("route EMAIL vers Microsoft Graph", async () => {
    await deliverInternalNotificationEvent("NOTIFICATION_EMAIL_REQUESTED", { notificationId: "email-1" });
    expect(delivery.email).toHaveBeenCalledWith("email-1");
    expect(delivery.push).not.toHaveBeenCalled();
  });

  it("conserve le routage PUSH existant", async () => {
    await deliverInternalNotificationEvent("NOTIFICATION_PUSH_REQUESTED", { notificationId: "push-1" });
    expect(delivery.push).toHaveBeenCalledWith("push-1");
    expect(delivery.email).not.toHaveBeenCalled();
  });

  it("ne charge ni n’appelle aucun fournisseur externe en V1", async () => {
    vi.stubEnv("PRODUCT_PROFILE", "v1");
    await deliverInternalNotificationEvent("NOTIFICATION_EMAIL_REQUESTED", { notificationId: "old-email" });
    await deliverInternalNotificationEvent("NOTIFICATION_PUSH_REQUESTED", { notificationId: "old-push" });
    expect(delivery.email).not.toHaveBeenCalled();
    expect(delivery.push).not.toHaveBeenCalled();
  });

  it("conserve la mise en file, les préférences et la déduplication hors des transactions réseau", () => {
    const notifications = readFileSync(resolve(process.cwd(), "lib/notifications.ts"), "utf8");
    expect(notifications).toContain("notificationPreference.findMany");
    expect(notifications).toContain('eventKey: `notification:${notification.id}:${channel.toLowerCase()}`');
    expect(notifications).toContain("NOTIFICATION_${channel}_REQUESTED");
    expect(notifications).not.toContain("deliverEmailNotification");
    expect(notifications).not.toContain("graph.microsoft.com");
  });
});
