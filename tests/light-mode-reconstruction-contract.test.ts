import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("mode clair industriel unifié", () => {
  it("garde une feuille de styles valide après les surcharges de thème", () => {
    expect(() => postcss.parse(css)).not.toThrow();
  });

  it("définit un socle clair unique avec des surfaces et une encre contrastées", () => {
    expect(css).toContain("Mode clair industriel unifié");
    expect(css).toContain("--industrial-black: #CACACA");
    expect(css).toContain("--industrial-panel: #FCFAF1");
    expect(css).toContain("--industrial-ink: #343434");
    expect(css).toContain("--industrial-red: #E6B31E");
    expect(css).toContain(".shell-sidebar-industrial");
  });

  it("couvre les panels, champs, tableaux, menus et états de tous les espaces", () => {
    expect(css).toContain(".ticket-create-hero");
    expect(css).toContain(".portfolio-table-surface");
    expect(css).toContain(".knowledge-article-card");
    expect(css).toContain(".assets-register-panel");
    expect(css).toContain(".admin-notice");
    expect(css).toContain(".status-chip-completed");
  });
});
