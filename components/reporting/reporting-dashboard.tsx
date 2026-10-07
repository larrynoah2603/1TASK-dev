import type { ReactNode } from "react";
import type { ReportingSummary } from "@/lib/reporting-service";
import StatCard from "@/components/ui/stat-card";
import { ReportingCharts } from "./reporting-charts";
import { TeamPerformanceTable } from "./team-performance-table";
import { TrendCard } from "./trend-card";

type Props = { summary: ReportingSummary; actions?: ReactNode };

function formatResolutionTime(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${remaining.toString().padStart(2, "0")}` : `${hours} h`;
}

export function ReportingDashboard({ summary, actions }: Props) {
  return <div className="reporting-dashboard"><header className="reporting-page-header"><div><p className="eyebrow">Performance Analytics</p><h1>Reporting &amp; Performance</h1><p>Analysez la performance opérationnelle et le respect des engagements SLA.</p></div><div className="reporting-page-actions">{actions}</div></header><section className="reporting-kpi-grid" aria-label="Indicateurs globaux"><StatCard title="Tickets traités" value={summary.closed} evolution="Périmètre autorisé" trend="neutral" tone="info" description={`${summary.total} tickets analysés`} /><StatCard title="Respect SLA" value={`${summary.slaComplianceRate}%`} evolution={summary.overdue ? `${summary.overdue} en retard` : "Aucun dépassement"} trend={summary.overdue ? "negative" : "positive"} tone={summary.overdue ? "warning" : "success"} /><StatCard title="Temps moyen résolution" value={formatResolutionTime(summary.averageResolutionMinutes)} evolution={summary.resolvedCount ? `${summary.resolvedCount} résolution(s) mesurée(s)` : "Aucune résolution mesurable"} trend="neutral" tone="neutral" description="Création → résolution" /><StatCard title="Tickets critiques" value={summary.criticalCount} evolution="Périmètre autorisé" trend={summary.criticalCount ? "negative" : "neutral"} tone="danger" description="Priorité Critique" /></section><ReportingCharts summary={summary} /><div className="reporting-bottom-grid"><TeamPerformanceTable /><TrendCard /></div></div>;
}
