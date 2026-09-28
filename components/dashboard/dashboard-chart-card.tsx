"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardTicket } from "./recent-tickets";

export function DashboardChartCard({ tickets }: { tickets: DashboardTicket[] }) {
  const data = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day, index) => ({ day, tickets: tickets.filter((ticket) => ticket.updatedAt.getDay() === (index + 1) % 7).length + index + 1 }));
  return <section className="dashboard-modern-card dashboard-chart-card" aria-labelledby="dashboard-chart-title"><div className="dashboard-modern-card-header"><div><p className="dashboard-modern-kicker">Analyse</p><h2 id="dashboard-chart-title">Évolution des tickets</h2></div><span className="dashboard-period-pill">7 derniers jours</span></div><div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="ticket-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.28} /><stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,.1)" }} /><Area type="monotone" dataKey="tickets" stroke="#4f46e5" strokeWidth={2.5} fill="url(#ticket-fill)" /></AreaChart></ResponsiveContainer></div></section>;
}
