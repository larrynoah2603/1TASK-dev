import Link from "next/link";
import type { Route } from "next";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { formatRelativeActivityDate } from "@/components/activity-icon";
import { Timeline } from "@/components/ui/timeline";

export function AgentActivity({ tickets }: { tickets: DashboardTicketRow[] }) {
  const recent = [...tickets]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 4);

  return (
    <section className="agent-card" aria-labelledby="agent-activity-title">
      <div className="agent-card-header">
        <div>
          <p className="eyebrow">Tickets de cette page</p>
          <h2 id="agent-activity-title">Mises à jour récentes</h2>
        </div>
      </div>
      {recent.length ? (
        <div className="agent-activity-list">
          <Timeline items={recent.map((ticket) => ({
            title: ticket.reference,
            content: (
              <Link href={`/tickets/${ticket.id}` as Route} className="agent-activity-link">
                <span className="agent-activity-topline">
                  <span className="agent-activity-ref">{ticket.reference}</span>
                  <span className="agent-activity-date">{formatRelativeActivityDate(ticket.updatedAt)}</span>
                </span>
                <span className="agent-activity-title">{ticket.title}</span>
              </Link>
            ),
          }))} />
        </div>
      ) : (
        <p className="agent-activity-empty">Aucun ticket sur cette page.</p>
      )}
      <p className="agent-activity-footnote">D'après la date de mise à jour des tickets affichés, pas le journal d'audit.</p>
    </section>
  );
}
