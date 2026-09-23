import { SlaChart } from "@/components/dashboard/sla-chart";

export function SlaOverviewCard({ tickets }: { tickets: Array<{ slaState: string; updatedAt: Date }> }) {
  const total = tickets.length;
  const healthy = tickets.filter((ticket) => ticket.slaState === "OK").length;
  const rate = total ? Math.round((healthy / total) * 100) : 0;
  const risk = tickets.filter((ticket) => ticket.slaState === "AT_RISK").length;
  const breached = tickets.filter((ticket) => ticket.slaState === "BREACHED").length;
  return <section className="dashboard-enterprise-card" aria-labelledby="dashboard-sla-title"><div className="dashboard-enterprise-card-header"><div><p className="eyebrow">Qualité de service</p><h2 id="dashboard-sla-title">Performance SLA</h2></div><span className="dashboard-widget-filter">Périmètre autorisé</span></div><div className="dashboard-sla-overview"><div className="dashboard-sla-score"><strong>{rate}%</strong><span>Respect SLA global</span></div><SlaChart tickets={tickets} /><div className="dashboard-sla-risk-list"><span><i className="dashboard-risk-dot dashboard-risk-ok" />Respecté <b>{healthy}</b></span><span><i className="dashboard-risk-dot dashboard-risk-warning" />À risque <b>{risk}</b></span><span><i className="dashboard-risk-dot dashboard-risk-danger" />Dépassé <b>{breached}</b></span></div></div></section>;
}
