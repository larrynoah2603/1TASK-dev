import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("compact agent inbox filters", () => {
  it("uses the compact filter layout only in the agent inbox", () => {
    const inbox = source("app/(app)/inbox/page.tsx");
    expect(inbox).toContain("<TicketViewSwitcher compactLabels");
    expect(inbox).toContain("query={rawParams}");
    expect(inbox).toContain("<TicketFilters compact");
    expect(inbox).toContain("scopeOptions={[]}");
  });

  it("keeps scope and SLA in quick views instead of duplicating them in the compact toolbar", () => {
    const filters = source("components/ticket-filters.tsx");
    expect(filters).toContain('type="hidden" name="scope"');
    expect(filters).toContain('type="hidden" name="sla"');
    expect(filters).toContain("Filtres{advancedCount");
    expect(filters).toContain("Département : {departmentName}");
    expect(filters).toContain("File : {queueName}");
  });

  it("keeps ownership views and SLA shortcuts visually separate", () => {
    const switcher = source("components/ticket-view-switcher.tsx");
    expect(switcher).toContain("compactScopeLabels");
    expect(switcher).toContain('label: compactLabels ? "À surveiller" : "SLA à surveiller"');
    expect(switcher).toContain("link.alert && index > 0");
    expect(switcher).toContain("links.push(...slaLinks)");
    expect(switcher).not.toContain("scopeLinks.splice");
  });
});
