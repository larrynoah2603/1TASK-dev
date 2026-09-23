"use client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SlaChart({ tickets }: { tickets: Array<{ slaState: string; updatedAt: Date }> }) {
  const data = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); const key = date.toISOString().slice(0, 10); const count = tickets.filter((ticket) => new Date(ticket.updatedAt).toISOString().slice(0, 10) === key).length; return { name: date.toLocaleDateString("fr-FR", { weekday: "short" }), value: count }; });
  return <div className="dashboard-sla-chart" aria-label="Évolution du SLA sur les sept derniers jours"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-subtle)", fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--text-subtle)", fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)" }} /><Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--brand)" }} /></LineChart></ResponsiveContainer></div>;
}
