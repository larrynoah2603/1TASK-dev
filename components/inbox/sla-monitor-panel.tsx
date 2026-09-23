import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { SlaProgress } from "@/components/ui/sla-progress";

export function SlaMonitorPanel({ tickets }: { tickets: DashboardTicketRow[] }) {
  const critical = tickets.filter((ticket) => ticket.slaState === "BREACHED");
  const attention = tickets.filter((ticket) => ticket.slaState === "AT_RISK");
  const normal = tickets.filter((ticket) => ticket.slaState === "OK");
  const rows = [{ label: "Normal", count: normal.length, tone: "normal" as const, value: 100 }, { label: "Attention", count: attention.length, tone: "attention" as const, value: 62 }, { label: "Critique", count: critical.length, tone: "overdue" as const, value: 28 }];
  return <aside className="agent-card agent-sla-panel" aria-labelledby="agent-sla-title"><div className="agent-card-header"><div><p className="eyebrow">Surveillance continue</p><h2 id="agent-sla-title">Surveillance SLA</h2></div></div><div className="agent-sla-list">{rows.map((row) => <div className="agent-sla-row" key={row.label}><div className="agent-sla-row-heading"><span className={`agent-sla-dot agent-sla-dot-${row.tone}`} />{row.label}<strong>{row.count}</strong></div><SlaProgress value={row.value} tone={row.tone} showValue={false} label={row.label} /></div>)}</div></aside>;
}
