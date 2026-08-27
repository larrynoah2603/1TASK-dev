import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("lot 8 administration industrial visual contract", () => {
  it("keeps session status checks and administrative access boundaries", () => {
    const layout = source("app/admin/layout.tsx");
    const dashboard = source("app/admin/page.tsx");

    expect(layout).toContain("getSessionUserContext()");
    expect(layout).toContain("PENDING_VALIDATION");
    expect(layout).toContain("PENDING_ASSIGNMENT");
    expect(layout).toContain('requireAdminAccess("ANY")');
    expect(layout).toContain('redirect("/dashboard?error=AdminAccessDenied")');
    expect(dashboard).toContain('requireAdminAccess("ANY")');
    expect(dashboard).toContain("RoleCode.FUNCTIONAL_ADMIN");
    expect(dashboard).toContain("admin-dashboard-industrial");
  });

  it("keeps admin navigation filtered by both global role and explicit permission", () => {
    const shell = source("components/admin-shell.tsx");

    expect(shell).toContain("hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN)");
    expect(shell).toContain("hasGlobalRole(subject, RoleCode.TECHNICAL_ADMIN)");
    expect(shell).toContain("visibleLinks = adminLinks.filter");
    expect(shell).toContain("roleAllowed && (!link.permission || permissions.includes(link.permission))");
    expect(shell).toContain("admin-industrial");
  });

  it("keeps functional administration entry points and audit visibility checks", () => {
    const users = source("app/admin/users/page.tsx");
    const audit = source("app/admin/audit/page.tsx");
    const catalog = source("app/admin/catalog/page.tsx");

    expect(users).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(audit).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(catalog).toContain('requireAdminAccess("FUNCTIONAL")');
  });

  it("contains a scoped lot 8 palette without new blue or violet accents", () => {
    const css = source("app/globals.css");
    const lotEight = css.slice(css.indexOf("Lot 8 — administration industrielle"));

    expect(lotEight).toContain(".admin-industrial");
    expect(lotEight).toContain(".admin-dashboard-industrial");
    expect(lotEight).not.toMatch(/blue|cyan|indigo|violet|#4c4dba|#5b5bd6/i);
  });
});
