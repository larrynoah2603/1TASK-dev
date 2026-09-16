import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("routage départemental des tickets", () => {
  it("persiste immédiatement le statut de qualification d'une demande libre", () => {
    const ticketService = source("lib/ticket-service.ts");

    expect(ticketService).toContain(
      "const initialStatus = parsed.serviceCatalogItemId ? TicketStatus.NEW : TicketStatus.TO_QUALIFY",
    );
    expect(ticketService).toContain("status: initialStatus");
  });

  it("contrôle aussi le département des créations issues du catalogue", () => {
    const ticketService = source("lib/ticket-service.ts");

    expect(ticketService).toContain("service.queue.departmentId !== actor.departmentId");
    expect(ticketService).toContain(
      "Vous ne pouvez pas envoyer un ticket vers un autre département.",
    );
  });

  it("ne propose que le département local sans permission transverse", () => {
    const departmentsRoute = source("app/api/departments/route.ts");

    expect(departmentsRoute).toContain(
      'hasPermission(actor, "ticket:create:cross-department")',
    );
    expect(departmentsRoute).toContain(
      'canCreateCrossDepartment ? {} : { id: actor.departmentId ?? "__none__" }',
    );
  });
});
