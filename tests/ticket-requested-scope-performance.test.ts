import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("prédicat du scope demandeur", () => {
  it("évite le scope ACL complexe uniquement pour les tickets personnels hors file de travail et reporting", () => {
    const code = readFileSync(resolve(process.cwd(), "lib/ticket-query-service.ts"), "utf8");
    const start = code.indexOf("async function calculateTicketListWhere");
    const end = code.indexOf("function ticketOrderBy", start);
    const implementation = code.slice(start, end);

    expect(implementation).toContain('options.scope === "requested" && !options.workQueue && options.mode !== "REPORTING"');
    expect(implementation).toContain('? { requesterId: current.id }');
    expect(implementation).toContain(": await visibleTicketWhere(current, options)");
  });
});
