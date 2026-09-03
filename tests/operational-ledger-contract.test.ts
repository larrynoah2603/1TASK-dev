import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const ledger = css.slice(css.indexOf("Operational Ledger — final visual foundation"));

describe("fondations visuelles Operational Ledger", () => {
  it("déclare la palette claire et sombre cible", () => {
    for (const color of ["#F4F5F2", "#202421", "#3559C7", "#C76B32", "#111411", "#F0F3EF", "#7893E8"]) {
      expect(ledger).toContain(color);
    }
  });

  it("limite les rayons et réserve les ombres aux overlays", () => {
    expect(ledger).toContain("--ledger-radius-control: 6px");
    expect(ledger).toContain("--ledger-radius-panel: 8px");
    expect(ledger).toContain("--ledger-radius-overlay: 10px");
    expect(ledger).toContain("--shadow-soft: none");
    expect(ledger).toContain("--ledger-overlay-shadow");
  });
});
