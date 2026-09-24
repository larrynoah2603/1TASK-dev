import type { ReactNode } from "react";
import type { ReportingSummary } from "@/lib/reporting-service";
import StatCard from "@/components/ui/stat-card";
import { ReportingCharts } from "./reporting-charts";
import { TeamPerformanceTable } from "./team-performance-table";
import { TrendCard } from "./trend-card";

type Props = { summary: ReportingSummary; actions?: ReactNode };
export function ReportingDashboard({ summary, actions }: Props) {
  const slaRate = summary.total ? Math.max(0, Math.round(((summary.total - summary.overdue) / summary.total) * 100)) : 0;
  return <div className="reporting-dashboard"><header className="reporting-page-header"><div><p className="eyebrow">Performance Analytics</p><h1>Reporting &amp; Performance</h1><p>Analysez la performance opérationnelle et le respect des engagements SLA.</p></div><div className="reporting-page-actions">{actions}</div></header><section className="reporting-kpi-grid" aria-label="Indicateurs globaux"><StatCard title="Tickets traités" value={summary.closed} evolution="Périmètre autorisé" trend="neutral" tone="info" description={`${summary.total} tickets analysés`} /><StatCard title="Respect SLA" value={`${slaRate}%`} evolution={summary.overdue ? `${summary.overdue} en retard` : "Aucun dépassement"} trend={summary.overdue ? "negative" : "positive"} tone={summary.overdue ? "warning" : "success"} /><StatCard title="Temps moyen résolution" value="—" evolution="Non fourni" trend="neutral" tone="neutral" description="Métrique indisponible" /><StatCard title="Tickets critiques" value="—" evolution="Non fourni" trend="neutral" tone="danger" description="Métrique indisponible" /></section><ReportingCharts summary={summary} /><div className="reporting-bottom-grid"><TeamPerformanceTable /><TrendCard /></div></div>;
}
