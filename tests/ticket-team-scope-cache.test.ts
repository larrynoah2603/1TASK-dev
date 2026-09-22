import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("réutilisation des membres actifs pour le scope équipe", () => {
  it("utilise le cache request-scoped au lieu d’un second findMany direct", () => {
    const code = readFileSync(resolve(process.cwd(), "lib/ticket-query-service.ts"), "utf8");
    const start = code.indexOf('case "team": {', code.indexOf("async function buildTicketListWhere"));
    const end = code.indexOf("default:", start);
    const block = code.slice(start, end);
    expect(block).toContain("loadActiveTeamMemberRows(teamIdsKey)");
    expect(block).not.toContain("prisma.teamMember.findMany");
  });
});
