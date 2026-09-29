import { Timeline } from "@/components/ui/timeline";
import { formatRelativeActivityDate } from "@/components/activity-icon";

export function DashboardActivity({ tickets }: { tickets: Array<{ reference: string; title: string; updatedAt: Date; status: string }> }) {
  const events = tickets.slice(0, 4).map((ticket) => ({ type: ticket.status === "CLOSED" ? "CLOSED" : "STATUS_CHANGED", title: ticket.status === "CLOSED" ? "Ticket fermé" : "Ticket modifié", description: `${ticket.reference} · ${ticket.title}`, meta: formatRelativeActivityDate(ticket.updatedAt), actor: "1TASK", tone: ticket.status === "CLOSED" ? "success" as const : "info" as const }));
  return <section className="dashboard-enterprise-card" aria-labelledby="dashboard-activity-title"><div className="dashboard-enterprise-card-header"><div><p className="eyebrow">Journal opérationnel</p><h2 id="dashboard-activity-title">Activité récente</h2></div></div>{events.length ? <Timeline items={events} /> : <p className="dashboard-empty">Aucune activité récente.</p>}</section>;
}
