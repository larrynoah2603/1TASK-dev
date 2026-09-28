import Link from "next/link";
import type { Route } from "next";
import { SlaIndicator } from "@/components/sla-indicator";
import type { TicketRow } from "@/components/ticket-table";
import { TicketMobileCard } from "./ticket-mobile-card";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketStatusBadge } from "./ticket-status-badge";

export function TicketsTable({ tickets, empty }: { tickets: TicketRow[]; empty: string }) {
  if (!tickets.length) return <div className="tickets-empty" role="status">{empty}</div>;
  return <>
    <div className="tickets-table-shell"><table className="tickets-modern-table"><caption className="sr-only">Liste des tickets</caption><thead><tr><th>Ticket</th><th>Service / file</th><th>Demandeur</th><th>Priorité</th><th>Statut</th><th>SLA</th><th>Actualisé</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><Link href={("/tickets/" + ticket.id) as Route} className="ticket-reference-link">{ticket.reference}</Link><strong>{ticket.title}</strong></td><td>{ticket.serviceCatalogItem.name}<small>{ticket.queue.name} · {ticket.queue.department.name}</small></td><td>{ticket.requester.name}<small>{ticket.assignedTo?.name ?? "Non affecté"}</small></td><td><TicketPriorityBadge priority={ticket.priority} /></td><td><TicketStatusBadge status={ticket.status} /></td><td><SlaIndicator state={ticket.slaState} dueAt={ticket.slaDueAt} startedAt={ticket.createdAt} pausedMinutes={ticket.totalPausedMinutes} compact /></td><td>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(ticket.updatedAt)}</td></tr>)}</tbody></table></div>
    <div className="tickets-mobile-list">{tickets.map((ticket) => <TicketMobileCard key={ticket.id} ticket={ticket} />)}</div>
  </>;
}
