import Link from "next/link";
import type { Route } from "next";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { PriorityBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";

export function PriorityTickets({ tickets }: { tickets: DashboardTicketRow[] }) {
  const priority = tickets
    .filter((ticket) => ticket.priority === "CRITICAL" || ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED")
    .slice(0, 4);
  const firstPriorityTicket = priority[0];

  return (
    <section className="agent-card agent-priority-card" aria-labelledby="priority-tickets-title">
      <div className="agent-card-header">
        <div>
          <p className="eyebrow">Action immédiate</p>
          <h2 id="priority-tickets-title">Tickets nécessitant une action</h2>
        </div>
        <span className="agent-card-count">{priority.length}</span>
      </div>

      <div className="priority-ticket-banner" aria-live="polite">
        <div>
          <strong>{priority.length
            ? `${priority.length} ticket${priority.length > 1 ? "s" : ""} nécessite${priority.length > 1 ? "nt" : ""} une action`
            : "Aucun ticket prioritaire"}</strong>
          <span>{priority.length ? "Les détails restent visibles dans votre liste de travail." : "Votre file ne contient aucune alerte prioritaire."}</span>
        </div>
        {firstPriorityTicket ? (
          <Link href={`/tickets/${firstPriorityTicket.id}` as Route} className="button-secondary">
            Voir
          </Link>
        ) : null}
      </div>

      <div className="priority-ticket-list">
        {priority.map((ticket) => (
          <Link href={`/tickets/${ticket.id}` as Route} key={ticket.id} className="priority-ticket-card">
            <div className="priority-ticket-top">
              <strong>{ticket.reference}</strong>
              <SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact />
            </div>
            <b>{ticket.title}</b>
            <span>{ticket.requester.name} · {ticket.queue.name}</span>
            <div className="priority-ticket-bottom">
              <PriorityBadge priority={ticket.priority} />
              <span>{ticket.assignedTo?.name ?? "Non affecté"}</span>
            </div>
          </Link>
        ))}
        {!priority.length ? <p className="agent-empty">Aucun ticket prioritaire à traiter.</p> : null}
      </div>
    </section>
  );
}
