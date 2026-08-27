import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("lot 7 SLA and reporting industrial visual contract", () => {
  it("keeps reporting scoped to its existing permission and server summary", () => {
    const reporting = source("app/(app)/reporting/page.tsx");
    const adminReporting = source("app/admin/reporting/page.tsx");

    expect(reporting).toContain('permissionCodes(user).includes("reporting:read")');
    expect(reporting).toContain("getReportingSummary(user)");
    expect(adminReporting).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(adminReporting).toContain("getReportingSummary(admin)");
    expect(reporting).toContain("reporting-industrial");
    expect(adminReporting).toContain("admin-reporting-industrial");
  });

  it("keeps SLA configuration restricted to functional administration and its existing SLA section", () => {
    const sla = source("app/admin/sla/page.tsx");

    expect(sla).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(sla).toContain('getAdminConfiguration(admin, ["sla"])');
    expect(sla).toContain('sections={["sla"]}');
    expect(sla).toContain("admin-sla-industrial");
  });

  it("keeps SLA labels, progress calculation and reporting export contract", () => {
    const indicator = source("components/sla-indicator.tsx");
    const exportRoute = source("app/api/reporting/export/route.ts");

    expect(indicator).toContain("slaProgressPercent(now, startedAt, dueAt, pausedMinutes)");
    expect(indicator).toContain('BREACHED: "Dépassement"');
    expect(indicator).toContain('PAUSED: "En pause"');
    expect(exportRoute).toContain("requireSessionUserContext()");
    expect(exportRoute).toContain("exportReportingSummary(actor)");
    expect(exportRoute).toContain('Content-Type": "text/csv; charset=utf-8"');
  });

  it("contains a scoped lot 7 palette without new blue or violet accents", () => {
    const css = source("app/globals.css");
    const lotSeven = css.slice(css.indexOf("Lot 7 — SLA et reporting industriels"));

    expect(lotSeven).toContain(".sla-reporting-industrial");
    expect(lotSeven).toContain(".reporting-status-bar");
    expect(lotSeven).not.toMatch(/blue|cyan|indigo|violet|#4c4dba|#5b5bd6/i);
  });
});
