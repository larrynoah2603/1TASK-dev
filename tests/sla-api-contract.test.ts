import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/api/admin/slas/route.ts"), "utf8");

describe("contrat API d'administration SLA", () => {
  it("liste et crée des SLA sans déléguer au service workflow", () => {
    expect(source).toContain('getAdminConfiguration(actor, ["sla"])');
    expect(source).toContain("saveSla(actor, undefined");
    expect(source).not.toContain("Workflow");
  });
});
