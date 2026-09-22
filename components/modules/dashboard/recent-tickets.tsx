import Link from "next/link";
import { TicketTable, type TicketRow } from "@/components/ticket-table";

export function RecentTickets({ tickets }: { tickets: TicketRow[] }) {
  return <section className="dashboard-widget dashboard-recent-widget" aria-labelledby="recent-tickets-title"><div className="dashboard-widget-header"><div><p className="eyebrow">Dernières demandes</p><h2 id="recent-tickets-title">Incidents récents</h2></div><Link href="/tickets" className="dashboard-widget-link">Voir tous les tickets <span aria-hidden="true">→</span></Link></div><div className="dashboard-recent-table"><TicketTable tickets={tickets.slice(0, 8)} showActions={false} empty="Vous n’avez encore créé aucun ticket." /></div></section>;
}
