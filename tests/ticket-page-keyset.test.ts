import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
describe("pagination keyset des écrans tickets", () => {
  it("désactive le total exact et transmet le curseur sur /tickets", () => {
    const page = source("app/(app)/tickets/page.tsx");
    expect(page).toContain("cursor: params.cursor");
    expect(page).toContain("{ includeTotal: false }");
    expect(page).toContain("TicketCursorPagination");
  });
  it("désactive le total exact et transmet le curseur sur /inbox", () => {
    const page = source("app/(app)/inbox/page.tsx");
    expect(page).toContain("cursor: params.cursor");
    expect(page).toContain("{ includeTotal: false }");
    expect(page).toContain("TicketCursorPagination");
  });
});
