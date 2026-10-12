import Link from "next/link";
import type { TicketStatus } from "@prisma/client";
import { Badge, Table } from "@/components/ui/primitives";
import { STATUS_LABELS } from "@/lib/domain";

export type DashboardTicket = {
  id: string;
  reference: string;
  title: string;
  requester: { name: string };
  status: string;
  slaState: string;
  updatedAt: Date;
};

function tone(status: string) {
  if (status === "CLOSED") return "success" as const;
  if (status === "BLOCKED" || status === "RESOLUTION_PENDING") return "warning" as const;
  if (status === "IN_PROGRESS") return "info" as const;
  return "neutral" as const;
}

export function RecentTickets({ tickets }: { tickets: DashboardTicket[] }) {
  return (
    <section className="dashboard-reference-card dashboard-recent-card" aria-labelledby="recent-tickets-title">
      <div className="dashboard-card-header">
        <div><p className="eyebrow">Mes demandes</p><h2 id="recent-tickets-title">Tickets récents</h2></div>
        <Link href="/tickets" className="dashboard-widget-link">Voir tous les tickets <span aria-hidden="true">→</span></Link>
      </div>
      <Table label="Tickets récents">
        <thead><tr><th>Référence</th><th>Sujet</th><th>Demandeur</th><th>Statut</th><th>SLA</th><th>Mis à jour</th></tr></thead>
        <tbody>
          {tickets.slice(0, 6).map((ticket) => (
            <tr key={ticket.id}>
              <td><Link href={`/tickets/${ticket.id}`} className="dashboard-ticket-reference">{ticket.reference}</Link></td>
              <td>{ticket.title}</td>
              <td>{ticket.requester.name}</td>
              <td><Badge tone={tone(ticket.status)}>{STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status}</Badge></td>
              <td><Badge tone={ticket.slaState === "OK" ? "success" : ticket.slaState === "BREACHED" ? "danger" : "warning"}>{ticket.slaState === "OK" ? "Sans alerte" : ticket.slaState === "BREACHED" ? "Dépassé" : "À surveiller"}</Badge></td>
              <td>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(ticket.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
