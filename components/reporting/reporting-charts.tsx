"use client";

import { Priority } from "@prisma/client";
import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportingSummary } from "@/lib/reporting-service";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";

export function ReportingCharts({ summary }: { summary: ReportingSummary }) {
  const statusData = summary.byStatus.map((row) => ({
    label: STATUS_LABELS[row.status],
    tickets: row.count,
  }));
  const priorityData = summary.byPriority.map((row) => ({
    label: PRIORITY_LABELS[row.priority],
    value: row.count,
    priority: row.priority,
  }));
  const slaData = [{ name: "SLA", value: summary.slaComplianceRate, fill: "var(--chart-2)" }];

  return <div className="reporting-chart-grid">
    <section className="reporting-card reporting-chart-card"><header className="reporting-card-header"><div><p className="eyebrow">Périmètre autorisé</p><h2>Répartition des tickets</h2></div></header><div className="reporting-chart-frame">{summary.total === 0 ? <p className="reporting-chart-empty">Aucun ticket dans cette période.</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="tickets" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</div></section>
    <section className="reporting-card reporting-chart-card"><header className="reporting-card-header"><div><p className="eyebrow">Engagements</p><h2>Performance SLA</h2></div></header><div className="reporting-radial-frame"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="65%" outerRadius="90%" data={slaData} startAngle={90} endAngle={-270} barSize={16}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar background dataKey="value" cornerRadius={10} /><text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="reporting-radial-value">{summary.slaTracked ? `${summary.slaComplianceRate}%` : "—"}</text><text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" className="reporting-radial-label">respecté</text></RadialBarChart></ResponsiveContainer></div><div className="reporting-legend"><span><i className="status-dot status-dot-success" />Respecté</span><span><i className="status-dot status-dot-warning" />Attention</span><span><i className="status-dot status-dot-danger" />Dépassé</span></div></section>
    <section className="reporting-card reporting-chart-card"><header className="reporting-card-header"><div><p className="eyebrow">Distribution</p><h2>Priorités</h2></div></header><div className="reporting-chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={priorityData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="label" width={70} /><Tooltip /><Bar dataKey="value" radius={[0, 5, 5, 0]}>{priorityData.map((item) => <Cell key={item.priority} fill={item.priority === Priority.CRITICAL ? "var(--chart-5)" : "var(--chart-1)"} />)}</Bar></BarChart></ResponsiveContainer></div><p className="reporting-data-note">{summary.total} ticket(s) dans le périmètre autorisé.</p></section>
  </div>;
}
