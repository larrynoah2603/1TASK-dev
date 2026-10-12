import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Lot UI/UX 02 — composants partagés", () => {
  it("unifies page headers, cards and filtering without replacing the 1TASK identity", () => {
    const css = source("styles/unified-components.css");
    const global = source("app/globals.css");
    const tokens = source("styles/tokens.css");

    expect(global).toContain('@import "../styles/unified-components.css";');
    for (const selector of [".page-header", ".ui-page-header", ".ds-page-header", ".saas-page-header", ".reporting-page-header", ".ui-stat-card", ".admin-stat", ".ui-filter-search"]) {
      expect(css, selector).toContain(selector);
    }
    expect(css).toContain("var(--kit-card)");
    expect(css).toContain("var(--kit-text-2)");
    expect(css).toContain("var(--kit-primary)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(tokens).toContain("--kit-brand: #EA7C29");
    expect(tokens).toContain("--kit-font: var(--font-ibm-plex-sans)");
  });

  it("preserves legacy component contracts while sharing canonical kit styling", () => {
    expect(source("components/ui/button.tsx")).toContain("kit-btn");
    expect(source("components/ui/card.tsx")).toContain("kit-card");
    expect(source("components/ui/table.tsx")).toContain("kit-table-wrap");
    expect(source("components/ui/page-header.tsx")).toContain("page-header");
    const filter = source("components/ui/filter-bar.tsx");
    expect(filter).toContain("Search");
    expect(filter).toContain('role="search"');
    expect(filter).toContain("onSearch");
  });

  it("keeps a single French h1 in the functional administration overview", () => {
    const page = source("app/admin/page.tsx");
    const dashboard = source("components/admin/admin-dashboard.tsx");
    expect(page).toContain('title="Administration du ticketing"');
    expect(dashboard).toContain("<h2 className=\"admin-console-heading\">Vue d’ensemble</h2>");
    expect(dashboard).not.toContain("Admin Overview");
    expect(dashboard).not.toContain("<h1>");
    expect(page).toContain('requireAdminAccess("ANY")');
  });
});
