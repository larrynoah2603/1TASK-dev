import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const layer = read("styles/uupm-refonte.css");
const globals = read("app/globals.css");
const active = /^html\[data-visual-profile="bios-glass-v31"\]/;

describe("Refonte UI/UX Pro Max — couche CSS finale", () => {
  it("est importée en dernier, après toutes les couches BIOS", () => {
    const imports = [...globals.matchAll(/@import "([^"]+)";/g)].map((match) => match[1]);
    expect(imports.at(-1)).toBe("../styles/uupm-refonte.css");
  });

  it("reste limitée au profil BIOS, sauf les tokens de graphiques", () => {
    const sheet = postcss.parse(layer, { from: "styles/uupm-refonte.css" });
    let rules = 0;
    sheet.walkRules((rule) => {
      rules += 1;
      for (const selector of rule.selectors) {
        if (selector.trim() === ":root") {
          rule.walkDecls((decl) => expect(decl.prop).toMatch(/^--chart-[1-5]$/));
          continue;
        }
        expect(selector.trim(), selector).toMatch(active);
      }
    });
    expect(rules).toBeGreaterThan(30);
  });

  it("définit les couleurs de graphiques utilisées par Recharts", () => {
    const charts = read("components/reporting/reporting-charts.tsx");
    for (const token of ["--chart-1", "--chart-2", "--chart-5"]) {
      expect(charts).toContain(`var(${token})`);
      expect(layer).toMatch(new RegExp(`${token}:\\s*var\\(--kit-`));
    }
  });

  it("garde un focus visible et respecte la réduction des animations", () => {
    expect(layer).toMatch(/:focus-visible\s*\{[^}]*outline: 2px solid/);
    expect(layer).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("corrige les surfaces illisibles en mode sombre sans couleur codée en dur", () => {
    const sheet = postcss.parse(layer);
    for (const selector of [".ticket-wizard-intro", ".ticket-wizard-summary", ".dashboard-card-header h2"]) {
      let found = false;
      sheet.walkRules((rule) => {
        if (!rule.selector.includes(selector)) return;
        found = true;
        rule.walkDecls((decl) => {
          if (["color", "background", "background-color"].includes(decl.prop)) {
            expect(decl.value, `${selector} ${decl.prop}`).toMatch(/var\(--|^inherit|^transparent|^currentColor/);
          }
        });
      });
      expect(found, selector).toBe(true);
    }
  });
});
