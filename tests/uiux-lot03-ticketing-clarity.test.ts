import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("UI/UX lot 03 — ticketing clarity", () => {
  it("does not describe a six-ticket SLA sample as a global distribution", () => {
    const watch = source("components/inbox/sla-monitor-panel.tsx");
    const page = source("app/(app)/inbox/page.tsx");
    expect(page).toContain('sla: "attention", take: 6');
    expect(watch).toContain("Alertes SLA");
    expect(watch).toContain("Échantillon limité");
    expect(watch).not.toContain("percentage(");
    expect(watch).not.toContain("Normal");
    expect(watch).toContain("/tickets/");
  });

  it("distinguishes ticket updates from confirmed audit events", () => {
    const rail = source("components/inbox/agent-activity.tsx");
    const dashboard = source("components/dashboard/activity-timeline.tsx");
    expect(rail).toContain("Tickets de cette page");
    expect(rail).not.toContain("Dernières actions");
    expect(rail).not.toContain("actor:");
    expect(dashboard).not.toContain('actor: "1TASK"');
    expect(dashboard).toContain("Mises à jour des tickets");
  });

  it("labels limited dashboard SLA and priority counters precisely", () => {
    const sla = source("components/dashboard/sla-overview.tsx");
    const kpis = source("components/dashboard/kpi-grid.tsx");
    const tickets = source("components/dashboard/recent-tickets.tsx");
    expect(sla).not.toContain("Respect SLA global");
    expect(sla).toContain("100 maximum");
    expect(kpis).toContain("demandes récentes");
    expect(tickets).not.toContain('"100%"');
  });

  it("keeps navigation, role scope, ticket detail tabs and inline preview unchanged", () => {
    const inbox = source("app/(app)/inbox/page.tsx");
    const detail = source("app/(app)/tickets/[id]/page.tsx");
    const tabs = source("components/tickets/detail/ticket-workspace-tabs.tsx");
    const table = source("components/inbox/agent-ticket-table.tsx");
    expect(inbox).toContain("<InboxWorkbench");
    expect(inbox).not.toContain("<TicketFilters");
    expect(inbox).not.toContain("Nouveau ticket");
    expect(detail).toContain('className="ticket-detail-main"');
    expect(detail).not.toContain('<main className="ticket-detail-main">');
    expect(tabs).toContain('role="tablist"');
    expect(table).toContain("colSpan={7}");
  });

  it("keeps the responsive and light/dark styles scoped to 1TASK tokens", () => {
    const css = source("styles/ticketing-workflows.css");
    expect(source("app/globals.css")).toContain('@import "../styles/ticketing-workflows.css";');
    expect(css).toContain("html[data-theme]");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("var(--kit-border)");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\\b/i);
  });
});
