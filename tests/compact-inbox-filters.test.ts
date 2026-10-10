import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("compact ticket filters", () => {
  it("keeps shared compact filters on generic ticket surfaces while Inbox uses its dedicated workbench", () => {
    const inbox = source("app/(app)/inbox/page.tsx");
    const ticketList = source("components/tickets/ticket-list.tsx");
    const ticketsToolbar = source("components/tickets/tickets-toolbar.tsx");
    const adminTickets = source("app/admin/tickets/page.tsx");
    const ticketsPage = source("app/(app)/tickets/page.tsx");
    const queuesPage = source("app/(app)/queues/page.tsx");

    expect(inbox).toContain("<InboxWorkbench");
    expect(inbox).not.toContain("<TicketViewSwitcher");
    expect(inbox).not.toContain("<TicketFilters");
    expect(ticketList).toContain("<TicketFilter compact");
    expect(ticketsToolbar).toContain("<TicketFilter compact");
    expect(adminTickets).toContain("<TicketFilters compact");
    expect(ticketsPage).toContain("<TicketViewSwitcher compactLabels");
    expect(ticketsPage).toContain("query={rawParams}");
    expect(queuesPage).toContain("<TicketViewSwitcher compactLabels");
  });

  it("keeps the generic compact toolbar contract for non-Inbox surfaces", () => {
    const filters = source("components/ticket-filters.tsx");

    expect(filters).toContain('type="hidden" name="scope"');
    expect(filters).toContain('type="hidden" name="sla"');
    expect(filters).toContain("Filtres{advancedCount");
    expect(filters).toContain("Département : {departmentName}");
    expect(filters).toContain("File : {queueName}");
  });

  it("keeps the reusable ownership and SLA switcher unchanged outside the Inbox", () => {
    const switcher = source("components/ticket-view-switcher.tsx");

    expect(switcher).toContain("compactScopeLabels");
    expect(switcher).toContain('label: compactLabels ? "À surveiller" : "SLA à surveiller"');
    expect(switcher).toContain("link.alert && index > 0");
    expect(switcher).toContain("links.push(...slaLinks)");
    expect(switcher).toContain('requested: "Mes demandes"');
    expect(switcher).toContain('sla === "attention" ? null : "attention"');
  });
});
