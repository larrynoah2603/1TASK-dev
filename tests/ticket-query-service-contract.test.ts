import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("module de lecture des tickets", () => {
  it("isole recherche, pagination et résumés des mutations", () => {
    const queryService = source("lib/ticket-query-service.ts");
    const ticketService = source("lib/ticket-service.ts");

    expect(queryService).toContain("export async function visibleTicketWhere");
    expect(queryService).toContain("export function listVisibleTicketsPage");
    expect(queryService).toContain("export async function getOperationalTicketSummary");
    expect(ticketService).not.toContain("async function listVisibleTicketsPageInternal");
    expect(ticketService).toContain('from "@/lib/ticket-query-service"');
    expect(queryService).toContain("toTicketListItemDomain");
  });

  it("branche les lectures API et métier sur le module dédié", () => {
    for (const file of [
      "app/api/tickets/route.ts",
      "app/api/search/route.ts",
      "lib/export-service.ts",
      "lib/reporting-service.ts",
      "lib/production-service.ts",
      "lib/ticket-queue-service.ts",
    ]) {
      expect(source(file)).toContain('from "@/lib/ticket-query-service"');
    }
  });

  it("maps the optimized Prisma projection to DTOs only at the API boundary", () => {
    const route = source("app/api/tickets/route.ts");
    expect(route).toContain("ticketPage.tickets.map(toTicketListItemDTO)");
  });
});
