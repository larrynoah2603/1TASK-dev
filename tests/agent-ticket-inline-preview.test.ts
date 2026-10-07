import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/inbox/agent-ticket-table.tsx"), "utf8");

describe("agent ticket inline preview", () => {
  it("expands ticket details directly below the selected row", () => {
    expect(source).toContain("expandedId");
    expect(source).toContain("aria-expanded={expanded}");
    expect(source).toContain("colSpan={7}");
    expect(source).toContain("Détails rapides");
    expect(source).toContain("toggleTicket(ticket.id)");
  });

  it("removes the old global quick-view panel", () => {
    expect(source).not.toContain("TicketSidePanel");
    expect(source).not.toContain("Vue rapide ticket");
    expect(source).not.toContain("DataTable");
  });

  it("keeps the operational actions inside the expanded row", () => {
    expect(source).toContain("ClaimTicketButton");
    expect(source).toContain("Ouvrir le ticket");
    expect(source).toContain("Réduire");
  });
});
