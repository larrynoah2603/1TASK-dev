import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("raffinement du dashboard opérationnel", () => {
  it("calcule les KPI demandeur avec un agrégat non plafonné", () => {
    const page = source("app/(app)/dashboard/page.tsx");
    const service = source("lib/ticket-query-service.ts");

    expect(page).toContain("getRequesterTicketSummary(user)");
    expect(page).toContain("statusCounts[TicketStatus.CLOSED]");
    expect(service).toContain("export async function getRequesterTicketSummary");
    expect(service).toContain('by: ["status"]');
  });

  it("offre une reprise accessible après une erreur serveur", () => {
    const errorBoundary = source("app/(app)/error.tsx");

    expect(errorBoundary).toContain('role="alert"');
    expect(errorBoundary).toContain("onClick={reset}");
    expect(errorBoundary).toContain("Réessayer");
  });
});
