import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { defaultChannelsForNotification, shouldPushByDefault } from "@/lib/notifications";
import { resolveProductCapabilities } from "@/lib/product-policy";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Web Push V1", () => {
  it("active uniquement le push sans réactiver les capacités full", () => {
    const capabilities = resolveProductCapabilities("v1");

    expect(capabilities.pushNotifications).toBe(true);
    expect(capabilities.externalEmailDelivery).toBe(false);
    expect(capabilities.externalOutboxDelivery).toBe(false);
    expect(capabilities.redisCache).toBe(false);
    expect(capabilities.publicApiV1).toBe(false);
    expect(capabilities.attachmentUploads).toBe(false);
    expect(capabilities.workflowDefinitions).toBe(false);
  });

  it("pousse les événements qui nécessitent une attention sans notifier la création à soi-même", () => {
    expect(shouldPushByDefault(NotificationType.TICKET_ASSIGNED)).toBe(true);
    expect(shouldPushByDefault(NotificationType.QUEUE_NEW_TICKET)).toBe(true);
    expect(shouldPushByDefault(NotificationType.TICKET_RESOLVED)).toBe(true);
    expect(shouldPushByDefault(NotificationType.SLA_WARNING)).toBe(true);
    expect(shouldPushByDefault(NotificationType.ASSET_APPROVED)).toBe(true);
    expect(shouldPushByDefault(NotificationType.TICKET_CREATED)).toBe(false);

    expect(defaultChannelsForNotification(NotificationType.TICKET_ASSIGNED, "INFO"))
      .toEqual([NotificationChannel.IN_APP, NotificationChannel.PUSH]);
  });

  it("ne mélange pas les lignes PUSH au centre de notifications in-app", () => {
    const service = source("lib/notification-service.ts");

    expect(service).toContain("channel: NotificationChannel.IN_APP");
  });

  it("permet d’activer et désactiver le push appareil par appareil", () => {
    const button = source("components/push-notification-button.tsx");
    const worker = source("public/push-sw.js");

    expect(button).toContain('navigator.serviceWorker.register("/push-sw.js")');
    expect(button).toContain('method: "POST"');
    expect(button).toContain('method: "DELETE"');
    expect(button).toContain("subscription.unsubscribe()");
    expect(worker).toContain('clients.matchAll({ type: "window", includeUncontrolled: true })');
    expect(worker).toContain("client.focus()");
    expect(worker).toContain("clients.openWindow(targetUrl)");
  });

  it("n’enfile aucun push tant que la configuration VAPID n’est pas complète", () => {
    const notifications = source("lib/notifications.ts");
    const environment = source("lib/env.ts");
    const outbox = source("lib/outbox.ts");

    expect(notifications).toContain("!capabilities.pushNotifications || !webPushConfigured()");
    expect(environment).toContain("pushValues.some(Boolean) && !pushValues.every(Boolean)");
    expect(outbox).toContain('AND "type" IN');
    expect(outbox).toContain('"NOTIFICATION_PUSH_REQUESTED"');
    expect(source("package.json")).toContain('"push:keys"');
  });
});
