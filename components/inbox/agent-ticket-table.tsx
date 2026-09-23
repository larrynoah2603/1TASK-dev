"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { TicketSidePanel } from "@/components/ticket-side-panel";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
import { ClaimTicketButton } from "@/components/claim-ticket-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export function AgentTicketTable({ tickets, claimableTicketIds }: { tickets: DashboardTicketRow[]; claimableTicketIds: string[] }) {
  const [selected, setSelected] = useState<DashboardTicketRow | null>(null);
  const columns: DataTableColumn<DashboardTicketRow>[] = [
    { key: "reference", header: "Référence", sortable: true, cell: (ticket) => <button type="button" className="agent-ticket-reference" onClick={() => setSelected(ticket)}>{ticket.reference}</button> },
    { key: "title", header: "Sujet", cell: (ticket) => <button type="button" className="agent-ticket-title" onClick={() => setSelected(ticket)}>{ticket.title}</button> },
    { key: "priority", header: "Priorité", cell: (ticket) => <PriorityBadge priority={ticket.priority} /> },
    { key: "status", header: "Statut", cell: (ticket) => <StatusBadge status={ticket.status} /> },
    { key: "requester", header: "Client", cell: (ticket) => ticket.requester.name },
    { key: "slaState", header: "SLA", cell: (ticket) => <SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact /> },
    { key: "updatedAt", header: "Dernière activité", sortable: true, cell: (ticket) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(ticket.updatedAt) },
  ];
  const selectedClaimable = selected ? claimableTicketIds.includes(selected.id) : false;
  return <div className="agent-ticket-workspace"><div className="agent-table-wrap"><DataTable columns={columns} data={tickets} getRowKey={(ticket) => ticket.id} caption="Mes tickets agent" emptyState="Aucun ticket actif pour ces critères." /></div><TicketSidePanel key={selected?.id ?? "empty"} defaultOpen={Boolean(selected)} title={selected ? selected.reference : "Vue rapide ticket"} subtitle={selected ? selected.title : "Sélectionnez un ticket pour afficher son résumé."}>{selected ? <div className="agent-preview-content"><dl><div><dt>Client</dt><dd>{selected.requester.name}</dd></div><div><dt>File</dt><dd>{selected.queue.name}</dd></div><div><dt>SLA</dt><dd><SlaBadge state={selected.slaState} dueAt={selected.slaDueAt} /></dd></div><div><dt>Assigné</dt><dd>{selected.assignedTo?.name ?? "Non affecté"}</dd></div></dl><div className="agent-preview-actions">{selectedClaimable ? <ClaimTicketButton ticketId={selected.id} /> : null}<Link href={`/tickets/${selected.id}` as Route} className="button-secondary">Ouvrir le ticket</Link></div></div> : <p className="agent-empty">Aucun ticket sélectionné.</p>}</TicketSidePanel></div>;
}
