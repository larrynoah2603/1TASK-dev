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
      "const initialStatus = routingMode === \"TRIAGE\" ? TicketStatus.TO_QUALIFY : TicketStatus.NEW",
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
    const authorization = source("lib/server-auth.ts");

    expect(authorization).toContain(
      'hasPermission(actor, "ticket:create:cross-department")',
    );
    expect(authorization).toContain(
      'canCreateCrossDepartment ? {} : { id: actor.departmentId ?? "__none__" }',
    );
    expect(departmentsRoute).toContain("requirePermissionForTicketCreationDepartments");
    expect(departmentsRoute).not.toContain("hasPermission");
  });

  it("réconcilie un timeout avec le token du créateur avant d'afficher un échec", () => {
    const form = source("components/new-ticket-form.tsx");
    const statusRoute = source("app/api/tickets/creation-status/route.ts");

    expect(form).toContain("RECONCILIATION_ATTEMPTS");
    expect(form).toContain("/api/tickets/creation-status?token=");
    expect(form).toContain("La création a été confirmée après vérification.");
    expect(statusRoute).toContain("findCreatedTicketByToken(actor, token)");
  });
});
