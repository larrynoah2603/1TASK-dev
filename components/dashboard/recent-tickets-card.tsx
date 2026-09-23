import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
import type { TicketRow } from "@/components/ticket-table";

export function RecentTicketsCard({ tickets }: { tickets: TicketRow[] }) {
  const columns: DataTableColumn<TicketRow>[] = [
    { key: "reference", header: "Référence", cell: (ticket) => <Link className="dashboard-ticket-reference" href={`/tickets/${ticket.id}`}>{ticket.reference}</Link> },
    { key: "title", header: "Sujet", cell: (ticket) => <span className="dashboard-ticket-title">{ticket.title}</span> },
    { key: "requester", header: "Demandeur", cell: (ticket) => ticket.requester.name },
    { key: "priority", header: "Priorité", cell: (ticket) => <PriorityBadge priority={ticket.priority} /> },
    { key: "status", header: "Statut", cell: (ticket) => <StatusBadge status={ticket.status} /> },
    { key: "slaState", header: "SLA", cell: (ticket) => <SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact /> },
    { key: "updatedAt", header: "Dernière modification", cell: (ticket) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(ticket.updatedAt) },
  ];
  return <section className="dashboard-enterprise-card dashboard-recent-card" aria-labelledby="dashboard-recent-title">
    <div className="dashboard-enterprise-card-header"><div><p className="eyebrow">Activité tickets</p><h2 id="dashboard-recent-title">Tickets récents</h2></div><Link href="/tickets" className="dashboard-widget-link">Voir tous les tickets <span aria-hidden="true">→</span></Link></div>
    <DataTable columns={columns} data={tickets.slice(0, 8)} getRowKey={(ticket) => ticket.id} emptyState="Aucun ticket récent dans votre périmètre." caption="Tickets récents" />
  </section>;
}
