import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { Timeline } from "@/components/ui/timeline";

export function AgentActivity({ tickets }: { tickets: DashboardTicketRow[] }) {
  const items = tickets.slice(0, 4).map((ticket) => ({ title: `${ticket.reference} actualisé`, description: ticket.title, meta: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(ticket.updatedAt), tone: (ticket.slaState === "BREACHED" ? "danger" : ticket.slaState === "AT_RISK" ? "warning" : "info") as "danger" | "warning" | "info" }));
  return <section className="agent-card" aria-labelledby="agent-activity-title"><div className="agent-card-header"><div><p className="eyebrow">Journal opérationnel</p><h2 id="agent-activity-title">Dernières actions</h2></div></div>{items.length ? <Timeline items={items} /> : <p className="agent-empty">Aucune activité récente.</p>}</section>;
}
