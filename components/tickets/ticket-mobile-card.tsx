import Link from "next/link";
import type { Route } from "next";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketSlaProgress } from "./ticket-sla-progress";
import { TicketStatusBadge } from "./ticket-status-badge";
import type { TicketRow } from "@/components/ticket-table";

export function TicketMobileCard({ ticket }: { ticket: TicketRow }) {
  return <article className="tickets-mobile-card">
    <div className="tickets-mobile-card-top"><Link href={("/tickets/" + ticket.id) as Route} className="ticket-reference-link">{ticket.reference}</Link><TicketStatusBadge status={ticket.status} /></div>
    <Link href={("/tickets/" + ticket.id) as Route} className="tickets-mobile-title">{ticket.title}</Link>
    <p className="tickets-mobile-meta">{ticket.requester.name} · {ticket.queue.name}</p>
    <div className="tickets-mobile-card-bottom"><TicketPriorityBadge priority={ticket.priority} /><TicketSlaProgress ticket={ticket} /></div>
  </article>;
}
