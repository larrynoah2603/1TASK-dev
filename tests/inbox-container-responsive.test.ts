import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("agent inbox responsive workbench", () => {
  it("keeps the page driven by the available inbox container width", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain("container-name: agent-inbox");
    expect(css).toContain("@container agent-inbox (min-width: 1351px)");
    expect(css).toContain("@container agent-inbox (max-width: 999px)");
    expect(css).toContain("@container agent-inbox (max-width: 699px)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) 19rem");
  });

  it("collapses search and advanced filters into one responsive control surface", () => {
    const workbench = source("components/inbox/inbox-workbench.tsx");
    const css = source("styles/design-system.css");

    expect(workbench).toContain("inbox-command-surface");
    expect(workbench).toContain("inbox-filter-form");
    expect(workbench).toContain("inbox-filter-panel");
    expect(workbench).toContain('name="status"');
    expect(workbench).toContain('name="priority"');
    expect(workbench).toContain('name="sla"');
    expect(css).toContain(".inbox-command-surface");
    expect(css).toContain(".inbox-filter-panel");
  });

  it("uses cards on mobile, grouped columns on normal desktop and seven columns only when very wide", () => {
    const table = source("components/inbox/agent-ticket-table.tsx");
    const css = source("styles/design-system.css");

    expect(table).toContain("agent-ticket-col-wide");
    expect(table).toContain("agent-ticket-col-condensed");
    expect(table).toContain("agent-ticket-mobile-list");
    expect(table).toContain(">Ticket<");
    expect(table).toContain(">Traitement<");
    expect(table).toContain(">Activité<");
    expect(css).toContain("container-name: agent-ticket-list");
    expect(css).toContain("@container agent-ticket-list (min-width: 700px)");
    expect(css).toContain("@container agent-ticket-list (min-width: 1450px)");
  });

  it("keeps urgent attention as one lightweight notice", () => {
    const priority = source("components/inbox/priority-tickets.tsx");
    const css = source("styles/design-system.css");

    expect(priority).toContain("inbox-priority-notice");
    expect(priority).toContain("SLA à risque, dépassé ou priorité critique.");
    expect(css).toContain(".inbox-priority-notice");
  });

  it("keeps the existing claim, inline preview and open-ticket actions", () => {
    const table = source("components/inbox/agent-ticket-table.tsx");

    expect(table).toContain("<ClaimTicketButton");
    expect(table).toContain("Détails rapides");
    expect(table).toContain("colSpan={7}");
    expect(table).toContain("Ouvrir le ticket");
    expect(table).toContain("Réduire");
  });
});
