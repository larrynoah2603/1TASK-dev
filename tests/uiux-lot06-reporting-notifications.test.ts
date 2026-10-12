import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("UI/UX lot 06 — reporting et notifications", () => {
  it("remplace les filtres décoratifs par un choix réellement appliqué côté serveur", () => {
    const period = source("components/reporting/reporting-filter.client.tsx");
    const service = source("lib/reporting-service.ts");
    const reporting = source("app/(app)/reporting/page.tsx");
    const admin = source("app/admin/reporting/page.tsx");
    expect(period).toContain('method="get"');
    expect(period).toContain('name="period"');
    expect(period).toContain("7 derniers jours");
    expect(period).not.toContain("useState");
    expect(service).toContain('createdAt: { gte:');
    expect(service).toContain('visibleTicketWhere(current, { mode: "REPORTING" })');
    expect(service).toContain('${scopeFingerprint}:${period}');
    expect(reporting).toContain('permissionCodes(user).includes("reporting:read")');
    expect(reporting).toContain("getReportingSummary(user, period)");
    expect(admin).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(admin).toContain("getReportingSummary(admin, period)");
  });

  it("ne présente jamais le CSV global comme un export filtré", () => {
    const reporting = source("app/(app)/reporting/page.tsx");
    const admin = source("app/admin/reporting/page.tsx");
    expect(reporting).toContain('href="/api/reporting/export"');
    expect(reporting).toContain("historique complet");
    expect(admin).toContain("historique complet");
    expect(reporting).not.toContain("Exporter Excel");
    expect(source("app/api/reporting/export/route.ts")).toContain("exportReportingSummary(actor)");
  });

  it("évite le faux zéro SLA et n'utilise pas de courbe chronologique pour un état catégoriel", () => {
    const chart = source("components/reporting/reporting-charts.tsx");
    const dashboard = source("components/reporting/reporting-dashboard.tsx");
    expect(chart).toContain("<BarChart data={statusData}>");
    expect(chart).not.toContain("<LineChart");
    expect(chart).toContain("summary.slaTracked");
    expect(dashboard).toContain('summary.slaTracked ?');
  });

  it("affiche la portée réelle des compteurs et conserve une seule barre de filtres", () => {
    const page = source("components/notifications/notifications-page.tsx");
    const header = source("components/notifications/notification-header.tsx");
    const filter = source("components/notifications/notification-filter.tsx");
    expect(page).toContain("loadedCount={items.length}");
    expect(page).toContain("notification-history-scope");
    expect(page).toContain("{nextCursor ? <div");
    expect(page).toContain('fetchWithTimeout("/api/notifications/read-all"');
    expect(page).toContain("pagination?.nextCursor");
    expect(header).toContain("notification");
    expect(filter).toContain("bg-[var(--kit-selected)]");
    expect(filter).toContain('aria-pressed={value === option.value}');
  });

  it("conserve le push, la navigation et les tokens 1TASK sur toute la vue", () => {
    const group = source("components/notifications/notification-group.tsx");
    const item = source("components/notifications/notification-item.tsx");
    const header = source("components/notifications/notification-header.tsx");
    const css = source("styles/reporting-notifications.css");
    expect(header).toContain("<PushNotificationButton />");
    expect(item).toContain("await onRead(item.id)");
    expect(item).toContain("router.push(actionUrl as Route)");
    expect(group).toContain("<NotificationItem");
    expect(source("app/globals.css")).toContain('@import "../styles/reporting-notifications.css";');
    expect(css).toContain("html[data-theme]");
    expect(css).toContain("var(--kit-text)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
