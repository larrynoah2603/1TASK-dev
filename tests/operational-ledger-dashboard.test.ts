import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("dashboard Operational Ledger", () => {
  it("supprime les pictogrammes textuels décoratifs des KPI", () => {
    const visuals = source("components/dashboard-visuals.tsx");
    expect(visuals).not.toContain("item.icon");
    expect(visuals).not.toContain("icon?: string");
  });

  it("utilise une densité lisible et les couleurs sémantiques", () => {
    const css = source("app/globals.css").slice(source("app/globals.css").indexOf("Operational Ledger — dashboard"));
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain("font-size: 12px");
    expect(css).toContain("var(--ledger-warning)");
  });
});
