import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { RadialBar, Tooltip } from "recharts";
import { ReportingCharts } from "@/components/reporting/reporting-charts";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";
import type { ReportingSummary } from "@/lib/reporting-service";

/* Component contract tests: complement the real-browser computed CSS tests.
   No service call, permissions, database state, or invented production data. */
function nodes(root: ReactNode): ReactElement[] {
  const result: ReactElement[] = [];
  function visit(node: ReactNode) {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      result.push(child);
      visit((child.props as { children?: ReactNode }).children);
    });
  }
  visit(root);
  return result;
}

function scenario(total: number, slaTracked: boolean, rate: number): ReportingSummary {
  return {
    total,
    slaTracked,
    slaComplianceRate: rate,
    byStatus: total ? [{ status: Object.keys(STATUS_LABELS)[0], count: total }] : [],
    byPriority: total ? [{ priority: Object.keys(PRIORITY_LABELS)[0], count: total }] : [],
  } as unknown as ReportingSummary;
}

describe("ReportingCharts — themed Recharts component contract", () => {
  it("sets its two tooltips inline so default white Recharts styles cannot win", () => {
    const elements = nodes(ReportingCharts({ summary: scenario(4, true, 75) }));
    const tooltips = elements.filter((node) => node.type === Tooltip);
    expect(tooltips).toHaveLength(2);
    for (const tooltip of tooltips) {
      const props = tooltip.props as {
        contentStyle: Record<string, unknown>;
        labelStyle: Record<string, unknown>;
        itemStyle: Record<string, unknown>;
        cursor: Record<string, unknown>;
      };
      expect(props.contentStyle.backgroundColor).toBe("var(--bios-glass-raised, var(--kit-card))");
      expect(props.contentStyle.color).toBe("var(--kit-text)");
      expect(props.labelStyle.color).toBe("var(--kit-text)");
      expect(props.itemStyle.color).toBe("var(--kit-text)");
      expect(props.cursor.fill).toBe("var(--kit-hover)");
    }
    const radial = elements.find((node) => node.type === RadialBar);
    expect((radial?.props as { background: { fill: string } }).background.fill).toBe("var(--kit-border-strong)");
  });

  it("keeps the graphs for a non-empty series with a zero count", () => {
    const summary = scenario(1, true, 0);
    summary.byStatus[0].count = 0;
    summary.byPriority[0].count = 0;
    const elements = nodes(ReportingCharts({ summary }));
    expect(elements.filter((node) => node.type === Tooltip)).toHaveLength(2);
    expect(elements.some((node) => node.props && (node.props as { children?: unknown }).children === "0%")).toBe(true);
  });

  it("renders two useful empty states without inventing SLA information", () => {
    const elements = nodes(ReportingCharts({ summary: scenario(0, false, 0) }));
    expect(elements.filter((node) => node.type === Tooltip)).toHaveLength(0);
    const empty = elements.filter((node) => (node.props as { className?: string }).className === "reporting-chart-empty");
    expect(empty).toHaveLength(2);
    expect(empty.every((node) => (node.props as { children?: string }).children === "Aucun ticket dans cette période.")).toBe(true);
    expect(elements.some((node) => (node.props as { children?: unknown }).children === "—")).toBe(true);
  });
});
