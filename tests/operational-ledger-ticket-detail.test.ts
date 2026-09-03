import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const detail = css.slice(css.indexOf("Operational Ledger — ticket intervention record"));

describe("fiche d'intervention ticket", () => {
  it("utilise des sections documentaires sans ombres imbriquées", () => {
    expect(detail).toContain(".ticket-side-panel-card .ticket-side-panel-card");
    expect(detail).toContain("border-top: 1px solid var(--ledger-border)");
    expect(detail).toContain("box-shadow: none");
  });

  it("conserve une taille lisible pour les métadonnées", () => {
    expect(detail).toContain("font-size: 12px !important");
  });
});
