import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("industrial shell visual contract", () => {
  it("keeps the existing permission filtering while adding only visual shell hooks", () => {
    const shell = source("components/app-shell.tsx");

    expect(shell).toContain('permissions.includes("ticket:create")');
    expect(shell).toContain("isFunctionalAssetAdministrator(user)");
    expect(shell).toContain("sidebar-user-block-industrial");
    expect(shell).toContain("topbar-layout-industrial");
  });

  it("provides structural and accessible hooks for the responsive navigation", () => {
    const container = source("components/collapsible-shell.tsx");
    const nav = source("components/shell-nav-link.tsx");

    expect(container).toContain("shell-industrial");
    expect(container).toContain("shell-structural-rule");
    expect(container).toContain('aria-label="Ouvrir le menu"');
    expect(nav).toContain("aria-current={active ? \"page\" : undefined}");
    expect(nav).toContain("nav-link-industrial");
  });

  it("removes the legacy blue search result treatment from the global search component", () => {
    const search = source("components/global-search.tsx");

    expect(search).toContain("global-search-industrial");
    expect(search).toContain("search-result-reference");
    expect(search).not.toContain("text-[#4c4dba]");
  });

  it("applies the saved theme before hydration and defaults safely to dark", () => {
    const layout = source("app/layout.tsx");

    expect(layout).toContain("localStorage.getItem('1task-theme') === 'light' ? 'light' : 'dark'");
    expect(layout).toContain("suppressHydrationWarning");
  });
});
