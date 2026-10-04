import Link from "next/link";
import type { Route } from "next";
import { Priority, TicketStatus } from "@prisma/client";
import { ClaimTicketButton } from "@/components/claim-ticket-button";
import { SlaIndicator } from "@/components/sla-indicator";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";

export type TicketRow = {
  id: string;
  reference: string;
  title: string;
  status: TicketStatus;
  priority: Priority;
  createdAt?: Date;
  updatedAt: Date;
  totalPausedMinutes?: number;
  queue: { name: string; department: { name: string }; manager: { name: string } | null };
  sourceDepartment?: { name: string } | null;
  requester: { name: string };
  assignedTo: { name: string } | null;
  serviceCatalogItem: { name: string };
  slaState: "NONE" | "OK" | "AT_RISK" | "BREACHED" | "PAUSED" | "CONFIRMATION_PENDING" | "CONFIRMATION_DUE";
  slaDueAt: Date | null;
};

export function TicketTable({
  tickets,
  claimableTicketIds = [],
  empty = "Aucun ticket à afficher.",
  showActions = true,
}: {
  tickets: TicketRow[];
  claimableTicketIds?: string[];
  empty?: string;
  showActions?: boolean;
}) {
  const claimable = new Set(claimableTicketIds);
  if (!tickets.length) return <div className="table-shell ticket-table-empty px-6 py-12 text-center text-sm text-slate-500" role="status">{empty}</div>;

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <table aria-label="Liste des tickets" className="ticket-data-table w-full min-w-[1080px] text-left text-[12px]">
          <thead className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.12em]">
            <tr>
              <th className="px-4 py-3.5">Ticket</th>
              <th className="px-4 py-3.5">Service</th>
              <th className="px-4 py-3.5">File</th>
              <th className="px-4 py-3.5">Agent</th>
              <th className="px-4 py-3.5">Responsable</th>
              <th className="px-4 py-3.5">Priorité</th>
              <th className="px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5">Signal SLA</th>
              <th className="px-4 py-3.5">Actualisé</th>
              {showActions ? <th className="px-4 py-3.5">Action</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className="px-4 py-3.5">
                  <Link href={("/tickets/" + ticket.id) as Route} className="ticket-reference-link font-semibold hover:underline">
                    {ticket.reference}
                  </Link>
                  <p className="mt-1 max-w-xs truncate font-medium text-slate-700">{ticket.title}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Demandeur : {ticket.requester.name}
                    {ticket.sourceDepartment ? " · source " + ticket.sourceDepartment.name : ""}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-slate-600">{ticket.serviceCatalogItem.name}</td>
                <td className="px-4 py-3.5 text-slate-600">
                  {ticket.queue.name}
                  <p className="text-[11px] text-slate-400">{ticket.queue.department.name}</p>
                </td>
                <td className="px-4 py-3.5 text-slate-600">{ticket.assignedTo?.name ?? "Non affecté"}</td>
                <td className="px-4 py-3.5 text-slate-600">{ticket.queue.manager?.name ?? "Non désigné"}</td>
                <td className="px-4 py-3.5"><PriorityBadge priority={ticket.priority} /></td>
                <td className="px-4 py-3.5"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3.5"><SlaIndicator state={ticket.slaState} dueAt={ticket.slaDueAt} startedAt={ticket.createdAt} pausedMinutes={ticket.totalPausedMinutes} compact /></td>
                <td className="px-4 py-3.5 text-[11px] text-slate-500">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(ticket.updatedAt)}
                </td>
                {showActions ? (
                  <td className="px-4 py-3.5">
                    {claimable.has(ticket.id) ? <ClaimTicketButton ticketId={ticket.id} /> : <Link href={("/tickets/" + ticket.id) as Route} className="ticket-reference-link text-xs font-semibold hover:underline">Ouvrir</Link>}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
