import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("compact inbox reception layout", () => {
  it("keeps KPIs as a compact actionable strip instead of large stat cards", () => {
    const kpis = source("components/inbox/agent-kpi-grid.tsx");
    const css = source("styles/design-system.css");

    expect(kpis).toContain("agent-kpi-strip");
    expect(kpis).toContain("agent-kpi-chip");
    expect(kpis).toContain("/inbox?scope=mine");
    expect(kpis).toContain("/inbox?scope=unassigned");
    expect(kpis).toContain("/inbox?sla=attention");
    expect(kpis).not.toContain("StatCard");
    expect(css).toContain("Inbox compact reception redesign");
    expect(css).toContain(".agent-kpi-strip");
  });

  it("keeps urgent tickets as one compact alert without duplicating ticket cards", () => {
    const priority = source("components/inbox/priority-tickets.tsx");

    expect(priority).toContain("priority-ticket-banner");
    expect(priority).toContain("Les détails restent visibles dans votre liste de travail.");
    expect(priority).toContain("if (!firstPriorityTicket) return null");
    expect(priority).not.toContain("priority-ticket-list");
    expect(priority).not.toContain("priority-ticket-card");
  });

  it("does not add a second new-ticket action inside the Inbox", () => {
    const page = source("app/(app)/inbox/page.tsx");

    expect(page).not.toContain("/tickets/new");
    expect(page).not.toContain("Nouveau ticket");
  });
});
