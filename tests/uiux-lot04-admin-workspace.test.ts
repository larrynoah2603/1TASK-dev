import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("UI/UX lot 04 — administration", () => {
  it("keeps one set of admin shortcuts without changing the main navigation", () => {
    const dashboard = source("components/admin/admin-dashboard.tsx");
    const shell = source("components/admin-shell.tsx");
    expect(dashboard).not.toContain('className="admin-section-nav"');
    expect(dashboard).toContain("admin-console-links");
    expect(dashboard).toContain('href="/admin/audit"');
    expect(shell).toContain("visibleLinks = adminLinks.filter");
    expect(shell).toContain("hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN)");
  });

  it("preserves server authorization and the department, queue, team and SLA workflows", () => {
    for (const path of [
      "app/admin/users/page.tsx",
      "app/admin/departments/page.tsx",
      "app/admin/queues/page.tsx",
      "app/admin/teams/page.tsx",
      "app/admin/catalog/page.tsx",
      "app/admin/sla/page.tsx",
    ]) {
      expect(source(path), path).toContain('requireAdminAccess("FUNCTIONAL")');
    }
    const config = source("components/admin-configuration-panel.tsx");
    expect(config).toContain('"/api/admin/queues"');
    expect(config).toContain('"/api/admin/departments"');
    expect(config).toContain("ConfirmDialog");
    expect(config).toContain("admin-form-feedback");
    expect(config).toContain('data-tone={messageTone}');
  });

  it("uses an accessible permission table instead of anonymous table roles", () => {
    const matrix = source("components/admin/permission-matrix.tsx");
    expect(matrix).toContain('<table className="admin-permission-table">');
    expect(matrix).toContain('scope="col"');
    expect(matrix).toContain('scope="row"');
    expect(matrix).toContain('tabIndex={0}');
    expect(matrix).toContain('aria-label="Matrice des permissions"');
  });

  it("adapts cards and config forms to the content width with the existing theme", () => {
    const css = source("styles/admin-workspace.css");
    const global = source("app/globals.css");
    expect(global).toContain('@import "../styles/admin-workspace.css";');
    expect(css).toContain("container-type: inline-size");
    expect(css).toContain("@container (max-width: 510px)");
    expect(css).toContain("html[data-theme]");
    expect(css).toContain("var(--kit-card)");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("keeps the Entra user identity and audit filters unchanged", () => {
    const users = source("app/admin/users/page.tsx");
    const audit = source("app/admin/audit/page.tsx");
    expect(users).toContain('name="q"');
    expect(users).toContain('name="status"');
    expect(users).toContain("UsersTable");
    expect(audit).toContain("listAuditLogsForViewerPage");
  });
});
