import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { Timeline } from "@/components/ui/timeline";
import { formatRelativeActivityDate } from "@/components/activity-icon";

export function AgentActivity({ tickets }: { tickets: DashboardTicketRow[] }) {
  const items = tickets.slice(0, 4).map((ticket) => ({ type: ticket.slaState === "BREACHED" ? "SLA_BREACH" : ticket.slaState === "AT_RISK" ? "SLA_ALERT" : "STATUS_CHANGED", title: `${ticket.reference} actualisé`, description: ticket.title, actor: ticket.assignedTo?.name ?? "1TASK", meta: formatRelativeActivityDate(ticket.updatedAt), tone: (ticket.slaState === "BREACHED" ? "danger" : ticket.slaState === "AT_RISK" ? "warning" : "info") as "danger" | "warning" | "info" }));
  return <section className="agent-card" aria-labelledby="agent-activity-title"><div className="agent-card-header"><div><p className="eyebrow">Journal opérationnel</p><h2 id="agent-activity-title">Dernières actions</h2></div></div>{items.length ? <Timeline items={items} /> : <p className="agent-empty">Aucune activité récente.</p>}</section>;
}
