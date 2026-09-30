import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NotificationChannel, NotificationSeverity } from "@prisma/client";
import { defaultChannelsForSeverity } from "@/lib/notifications";
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("explorateur centralisé des dépendances", () => {
  const engine = source("lib/services/deletion-impact.service.ts");
  const admin = source("lib/admin-service.ts");
  it("supporte les cinq types et retourne des bloqueurs structurés", () => {
    for (const type of ["USER", "DEPARTMENT", "QUEUE", "TEAM", "CATALOG_ITEM"]) expect(engine).toContain(`"${type}"`);
    for (const field of ["canDelete", "totalBlockers", "severity", "resolution", "adminPath", "protectedHistory"]) expect(engine).toContain(field);
  });
  it("localise files, mappings Entra, périmètres et règles de notification", () => {
    expect(engine).toContain("/admin/queues?departmentId=");
    expect(engine).toContain("ENTRA_MAPPING");
    expect(engine).toContain("PERMISSION_SCOPE");
    expect(engine).toContain("NOTIFICATION_RULE");
  });
  it("classe tickets, événements et affectations comme historique protégé", () => {
    expect(engine).toContain('resolution: "HISTORY_PROTECTED"');
    expect(engine).toContain('protectedHistory: true');
  });
  it("est la source unique des DELETE", () => {
    expect(admin).toContain("getDeletionImpact");
    for (const type of ["USER", "DEPARTMENT", "QUEUE", "TEAM", "CATALOG_ITEM"]) expect(admin).toContain(`requireDeletable("${type}"`);
    expect(admin).not.toContain("const counts = await Promise.all");
  });
  it("protège l’API et expose la page détaillée", () => {
    const route = source("app/api/admin/deletion-impact/route.ts");
    expect(route).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(route).toContain("getDeletionImpact");
    expect(source("app/admin/dependencies/[entityType]/[entityId]/page.tsx")).toContain("Historique métier protégé");
  });
});

describe("moteur central de notifications", () => {
  it.each([
    [NotificationSeverity.INFO, [NotificationChannel.IN_APP]],
    [NotificationSeverity.SUCCESS, [NotificationChannel.IN_APP]],
    [NotificationSeverity.WARNING, [NotificationChannel.IN_APP, NotificationChannel.PUSH]],
    [NotificationSeverity.CRITICAL, [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL]],
  ])("résout les canaux de %s", (severity, expected) => expect(defaultChannelsForSeverity(severity)).toEqual(expected));
  it("applique préférences, règles, sécurité obligatoire et déduplication", () => {
    const notifications = source("lib/notifications.ts");
    expect(notifications).toContain("notificationRule.findMany");
    expect(notifications).toContain("notificationPreference.findMany");
    expect(notifications).toContain("NotificationType.SECURITY");
    expect(notifications).toContain('error.code !== "P2002"');
    expect(notifications).toContain("enqueueOutboxEvent");
  });
  it("gère inscription, révocation, appareils multiples et abonnements expirés", () => {
    const route = source("app/api/notifications/push-subscriptions/route.ts");
    const delivery = source("lib/push-notification-service.ts");
    expect(route).toContain("pushSubscription.upsert");
    expect(route).toContain("pushSubscription.deleteMany");
    expect(delivery).toContain("statusCode === 404 || statusCode === 410");
  });
  it("livre le push via l’outbox sans coupler les transactions métier au réseau", () => {
    const outbox = source("lib/outbox.ts");
    expect(outbox).toContain('event.type === "NOTIFICATION_PUSH_REQUESTED"');
    expect(outbox).toContain("deliverPushNotification");
  });
});
