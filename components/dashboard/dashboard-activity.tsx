import { Timeline } from "@/components/ui/timeline";

export function DashboardActivity({ tickets }: { tickets: Array<{ reference: string; title: string; updatedAt: Date; status: string }> }) {
  const events = tickets.slice(0, 4).map((ticket) => ({ title: ticket.status === "CLOSED" ? "Ticket résolu" : "Ticket actualisé", description: `${ticket.reference} · ${ticket.title}`, date: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(ticket.updatedAt), tone: ticket.status === "CLOSED" ? "success" as const : "info" as const }));
  return <section className="dashboard-enterprise-card" aria-labelledby="dashboard-activity-title"><div className="dashboard-enterprise-card-header"><div><p className="eyebrow">Journal opérationnel</p><h2 id="dashboard-activity-title">Activité récente</h2></div></div>{events.length ? <Timeline items={events.map((event) => ({ ...event, meta: event.date }))} /> : <p className="dashboard-empty">Aucune activité récente.</p>}</section>;
}
