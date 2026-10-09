import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("agent inbox container responsive layout", () => {
  it("drives the inbox layout from container queries", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain("container-name: agent-inbox");
    expect(css).toContain("@container agent-inbox (min-width: 1351px)");
    expect(css).toContain("@container agent-inbox (min-width: 1000px) and (max-width: 1350px)");
    expect(css).toContain("@container agent-inbox (max-width: 699px)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) 19rem");
  });

  it("keeps compact ticket filters responsive to their own available width", () => {
    const filters = source("components/ticket-filters.tsx");
    const css = source("styles/design-system.css");

    expect(filters).toContain("ticket-filters-compact");
    expect(filters).toContain("data-compact-filters-open");
    expect(filters).toContain('type="hidden" name="departmentId"');
    expect(filters).toContain("Filtres{advancedCount");
    expect(css).toContain("container-name: ticket-filters");
    expect(css).toContain("@container ticket-filters (min-width: 700px)");
    expect(css).toContain("@container ticket-filters (min-width: 1000px)");
  });

  it("switches the agent list from seven columns to four columns and then cards", () => {
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
    expect(css).toContain("@container agent-ticket-list (min-width: 1100px)");
  });

  it("uses a compact priority alert outside the wide layout", () => {
    const priority = source("components/inbox/priority-tickets.tsx");
    const css = source("styles/design-system.css");

    expect(priority).toContain("priority-ticket-banner");
    expect(priority).toContain("Les détails restent visibles dans votre liste de travail.");
    expect(css).toContain(".priority-ticket-list");
    expect(css).toContain(".priority-ticket-banner");
  });

  it("keeps the existing claim and open-ticket actions in responsive list modes", () => {
    const table = source("components/inbox/agent-ticket-table.tsx");

    expect(table).toContain("<ClaimTicketButton");
    expect(table).toContain("Ouvrir le ticket");
    expect(table).toContain(">Ouvrir<");
  });
});
