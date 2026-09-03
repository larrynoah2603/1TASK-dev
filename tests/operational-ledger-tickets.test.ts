import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("registre tickets Operational Ledger", () => {
  it("utilise un lien technique sans couleur codée dans le JSX", () => {
    const table = source("components/ticket-table.tsx");
    expect(table).toContain("ticket-reference-link");
    expect(table).not.toContain("text-[#4c4dba]");
  });

  it("propose une ligne-dossier mobile sans largeur rigide", () => {
    const css = source("app/globals.css").slice(source("app/globals.css").indexOf("Operational Ledger — ticket register"));
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) auto auto");
    expect(css).toContain("display: none");
    expect(css).toContain("min-width: 0");
  });
});
