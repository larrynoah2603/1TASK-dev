"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportingSummary } from "@/lib/reporting-service";

const statusLabels: Record<string, string> = { OPEN: "Ouverts", IN_PROGRESS: "En cours", RESOLUTION_PENDING: "Résolution", BLOCKED: "Bloqués", CLOSED: "Clôturés", CANCELLED: "Annulés" };
const priorityData = [{ label: "Critique", value: 0 }, { label: "Haute", value: 0 }, { label: "Normale", value: 0 }, { label: "Faible", value: 0 }];

export function ReportingCharts({ summary }: { summary: ReportingSummary }) {
  const statusData = summary.byStatus.map((row) => ({ label: statusLabels[row.status] ?? row.status, tickets: row.count }));
  const slaRate = summary.completionDenominator ? Math.max(0, Math.round(((summary.completionDenominator - summary.overdue) / summary.completionDenominator) * 100)) : 0;
  const slaData = [{ name: "SLA", value: slaRate, fill: "var(--chart-2)" }];
  return <div className="reporting-chart-grid">
    <section className="reporting-card reporting-chart-card"><header className="reporting-card-header"><div><p className="eyebrow">Périmètre autorisé</p><h2>Répartition des tickets</h2></div></header><div className="reporting-chart-frame"><ResponsiveContainer width="100%" height="100%"><LineChart data={statusData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="tickets" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></section>
    <section className="reporting-card reporting-chart-card"><header className="reporting-card-header"><div><p className="eyebrow">Engagements</p><h2>Performance SLA</h2></div></header><div className="reporting-radial-frame"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="65%" outerRadius="90%" data={slaData} startAngle={90} endAngle={-270} barSize={16}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar background dataKey="value" cornerRadius={10} /><text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="reporting-radial-value">{slaRate}%</text><text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" className="reporting-radial-label">respecté</text></RadialBarChart></ResponsiveContainer></div><div className="reporting-legend"><span><i className="status-dot status-dot-success" />Respecté</span><span><i className="status-dot status-dot-warning" />Attention</span><span><i className="status-dot status-dot-danger" />Dépassé</span></div></section>
    <section className="reporting-card reporting-chart-card"><header className="reporting-card-header"><div><p className="eyebrow">Distribution</p><h2>Priorités</h2></div></header><div className="reporting-chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={priorityData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="label" width={70} /><Tooltip /><Bar dataKey="value" radius={[0, 5, 5, 0]}>{priorityData.map((item) => <Cell key={item.label} fill={item.label === "Critique" ? "var(--chart-5)" : "var(--chart-1)"} />)}</Bar></BarChart></ResponsiveContainer></div><p className="reporting-data-note">Les agrégats de priorité ne sont pas exposés par le service actuel.</p></section>
  </div>;
}
