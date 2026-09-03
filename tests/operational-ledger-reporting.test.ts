import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "app/(app)/reporting/page.tsx"), "utf8");

describe("reporting Operational Ledger", () => {
  it("utilise des classes sémantiques sans couleurs codées dans le JSX", () => {
    expect(page).toContain("reporting-kpi-primary");
    expect(page).toContain("reporting-kpi-danger");
    expect(page).toContain("reporting-kpi-success");
    expect(page).not.toMatch(/#4c4dba|#5b5bd6/i);
  });

  it("expose l'export uniquement avec la permission existante", () => {
    expect(page).toContain('permissionCodes(user).includes("reporting:export")');
    expect(page).toContain('href="/api/reporting/export"');
  });
});
