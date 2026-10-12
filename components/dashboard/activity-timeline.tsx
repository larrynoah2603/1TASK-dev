import { Timeline } from "@/components/ui/timeline";
import { formatRelativeActivityDate } from "@/components/activity-icon";
import type { DashboardTicket } from "./recent-tickets";

export function ActivityTimeline({ tickets }: { tickets: DashboardTicket[] }) {
  const items = [...tickets]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 4)
    .map((ticket) => ({
      title: `${ticket.reference} · mise à jour`,
      description: ticket.title,
      meta: formatRelativeActivityDate(ticket.updatedAt),
      tone: "info" as const,
    }));

  return (
    <section className="dashboard-reference-card dashboard-activity-card" aria-labelledby="activity-title">
      <div className="dashboard-card-header">
        <div>
          <p className="eyebrow">Dernières demandes affichées</p>
          <h2 id="activity-title">Mises à jour des tickets</h2>
        </div>
      </div>
      {items.length ? <Timeline items={items} /> : <p className="dashboard-empty">Aucune demande à afficher.</p>}
    </section>
  );
}
