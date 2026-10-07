import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reporting real metrics", () => {
  it("removes placeholder KPI and priority data", () => {
    const dashboard = source("components/reporting/reporting-dashboard.tsx");
    const charts = source("components/reporting/reporting-charts.tsx");

    expect(dashboard).toContain("summary.averageResolutionMinutes");
    expect(dashboard).toContain("summary.criticalCount");
    expect(dashboard).not.toContain('description="Métrique indisponible"');

    expect(charts).toContain("summary.byPriority");
    expect(charts).toContain("STATUS_LABELS[row.status]");
    expect(charts).not.toContain("Les agrégats de priorité ne sont pas exposés");
  });

  it("uses one canonical SLA compliance rate across reporting views", () => {
    for (const path of [
      "components/reporting/reporting-dashboard.tsx",
      "components/reporting/reporting-charts.tsx",
      "components/reporting/reporting-page.tsx",
      "components/reporting/sla-overview-card.tsx",
      "components/dashboard-visuals.tsx",
    ]) {
      expect(source(path), path).toContain("slaComplianceRate");
    }
  });
});
