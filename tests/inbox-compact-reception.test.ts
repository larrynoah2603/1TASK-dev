import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("modern inbox reception layout", () => {
  it("keeps counters as a subtle non-interactive header summary", () => {
    const kpis = source("components/inbox/agent-kpi-grid.tsx");
    const page = source("app/(app)/inbox/page.tsx");
    const css = source("styles/design-system.css");

    expect(kpis).toContain("inbox-summary-inline");
    expect(kpis).not.toContain("Link");
    expect(kpis).not.toContain("StatCard");
    expect(page).toContain("<Suspense fallback={<InboxKpiSkeleton />}>");
    expect(css).toContain("Inbox V2 unified workbench redesign");
    expect(css).toContain(".inbox-summary-inline");
  });

  it("uses one compact priority notice without duplicating ticket cards", () => {
    const priority = source("components/inbox/priority-tickets.tsx");

    expect(priority).toContain("inbox-priority-notice");
    expect(priority).toContain("à traiter en priorité");
    expect(priority).toContain("if (!firstPriorityTicket) return null");
    expect(priority).not.toContain("priority-ticket-list");
    expect(priority).not.toContain("priority-ticket-card");
  });

  it("uses one unified workbench instead of stacking a view switcher and a second filter bar", () => {
    const page = source("app/(app)/inbox/page.tsx");
    const workbench = source("components/inbox/inbox-workbench.tsx");

    expect(page).toContain("<InboxWorkbench");
    expect(page).not.toContain("<TicketViewSwitcher");
    expect(page).not.toContain("<TicketFilters");
    expect(workbench).toContain("inbox-scope-tabs");
    expect(workbench).toContain("inbox-search-box");
    expect(workbench).toContain("inbox-filter-trigger");
    expect(workbench).toContain("inbox-filter-panel");
  });

  it("does not add a second new-ticket action inside the Inbox", () => {
    const page = source("app/(app)/inbox/page.tsx");

    expect(page).not.toContain("/tickets/new");
    expect(page).not.toContain("Nouveau ticket");
  });
});
