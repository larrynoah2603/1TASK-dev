import Link from "next/link";
import type { Route } from "next";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";

export function PriorityTickets({ tickets }: { tickets: DashboardTicketRow[] }) {
  const priority = tickets.filter(
    (ticket) =>
      ticket.priority === "CRITICAL" ||
      ticket.slaState === "AT_RISK" ||
      ticket.slaState === "BREACHED",
  );
  const firstPriorityTicket = priority[0];

  if (!firstPriorityTicket) return null;

  return (
    <section
      className="agent-card agent-priority-card agent-priority-compact"
      aria-labelledby="priority-tickets-title"
    >
      <h2 id="priority-tickets-title" className="ui-sr-only">
        Tickets nécessitant une action
      </h2>

      <div className="priority-ticket-banner" aria-live="polite">
        <div>
          <strong>
            {priority.length} ticket{priority.length > 1 ? "s" : ""} nécessite{priority.length > 1 ? "nt" : ""} une action
          </strong>
          <span>Les détails restent visibles dans votre liste de travail.</span>
        </div>
        <Link href={`/tickets/${firstPriorityTicket.id}` as Route} className="button-secondary">
          Voir
        </Link>
      </div>
    </section>
  );
}
