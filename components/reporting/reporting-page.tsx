import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Ticket } from "lucide-react";
import type { ReportingSummary } from "@/lib/reporting-service";
import { ReportingHeader } from "./reporting-header";
import { ReportingKpiCard } from "./reporting-kpi-card";
import { ReportingCharts } from "./reporting-charts";
import { SlaOverviewCard } from "./sla-overview-card";
import { TeamPerformanceTable } from "./team-performance-table";
import { ExportReportCard } from "./export-report-card";

export function ReportingPage({ summary, actions, filters }: { summary: ReportingSummary; actions?: ReactNode; filters?: ReactNode }) {
  const compliance = summary.total ? Math.max(0, Math.round(((summary.total - summary.overdue) / summary.total) * 100)) : 0;
  return <div className="reporting-modern-page"><ReportingHeader actions={actions} />{filters}<section className="reporting-modern-kpis" aria-label="Indicateurs clés"><ReportingKpiCard label="Total tickets" value={summary.total} detail="dans le périmètre autorisé" icon={Ticket} tone="blue" /><ReportingKpiCard label="Tickets résolus" value={summary.closed} detail={`${summary.closureRate}% du volume total`} icon={CheckCircle2} tone="green" /><ReportingKpiCard label="SLA compliance" value={`${compliance}%`} detail="engagements respectés" icon={Clock3} tone="amber" /><ReportingKpiCard label="Tickets en retard" value={summary.overdue} detail="nécessitent une action" icon={AlertTriangle} tone="red" /></section><div className="reporting-modern-main-grid"><ReportingCharts summary={summary} /><SlaOverviewCard summary={summary} /></div><section className="reporting-modern-card reporting-team-card"><div className="reporting-modern-card-heading"><div><p className="reporting-kicker">Performance équipe</p><h2>Vue opérationnelle</h2></div></div><TeamPerformanceTable /></section><ExportReportCard actions={actions} /></div>;
}
