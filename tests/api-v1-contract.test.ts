import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("contrat public API v1", () => {
  it("expose une liste paginée stable sans modifier la route historique", () => {
    const route = source("app/api/v1/tickets/route.ts");
    expect(route).toContain("const response: TicketListDTO");
    expect(route).toContain("data: result.tickets.map(toTicketListItemDTO)");
    expect(route).toContain("pagination:");
    expect(route).toContain('requireApiPermission(request, "ticket:read")');
  });

  it("sérialise création et détail à travers les DTO", () => {
    expect(source("app/api/v1/tickets/route.ts")).toContain("toTicketDTO(toTicketDomain(ticket))");
    expect(source("app/api/v1/tickets/[id]/route.ts")).toContain("toTicketDetailDTO");
  });

  it("documente les routes, réponses et schémas versionnés", () => {
    const openapi = source("docs/api/openapi.yaml");
    for (const expected of [
      "/api/v1/tickets:",
      "operationId: discoverApiV1",
      "/api/v1/tickets/{id}:",
      "operationId: listTicketsV1",
      "TicketList:",
      "Pagination:",
      "Error:",
    ]) expect(openapi).toContain(expected);
    expect(openapi).toContain('version: 1.1.0');
    expect(openapi).toContain("oauth2Bearer:");
    expect(openapi).toContain("X-1TASK-Client");
  });

  it("isole le transport, l’authentification et les DTO du domaine", () => {
    const route = source("app/api/v1/tickets/route.ts");
    const detailContract = source("contracts/ticket.dto.ts");
    expect(route).toContain("withPublicApiV1");
    expect(route).not.toContain("requireSessionUserContext");
    expect(detailContract).toContain("export interface TicketDetailDTO extends TicketDTO");
    expect(detailContract).not.toContain("TicketDetailDomain");
  });
});
