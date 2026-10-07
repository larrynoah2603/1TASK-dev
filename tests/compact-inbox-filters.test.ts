import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("compact ticket filters", () => {
  it("uses the compact filter layout on every shared ticket list surface", () => {
    const inbox = source("app/(app)/inbox/page.tsx");
    const ticketList = source("components/tickets/ticket-list.tsx");
    const ticketsToolbar = source("components/tickets/tickets-toolbar.tsx");
    const adminTickets = source("app/admin/tickets/page.tsx");
    const ticketsPage = source("app/(app)/tickets/page.tsx");
    const queuesPage = source("app/(app)/queues/page.tsx");

    expect(inbox).toContain("<TicketViewSwitcher compactLabels");
    expect(inbox).toContain("query={rawParams}");
    expect(inbox).toContain("<TicketFilters compact");
    expect(ticketList).toContain("<TicketFilter compact");
    expect(ticketsToolbar).toContain("<TicketFilter compact");
    expect(adminTickets).toContain("<TicketFilters compact");
    expect(ticketsPage).toContain("<TicketViewSwitcher compactLabels");
    expect(ticketsPage).toContain("query={rawParams}");
    expect(queuesPage).toContain("<TicketViewSwitcher compactLabels");
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
    expect(switcher).toContain('requested: "Mes demandes"');
    expect(switcher).toContain('sla === "attention" ? null : "attention"');
    expect(switcher).not.toContain("scopeLinks.splice");
    expect(switcher).not.toContain("useSearchParams");
  });
});
