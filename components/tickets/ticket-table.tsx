"use client";

import Link from "next/link";
import type { Route } from "next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/primitives";
import { SlaProgress } from "@/components/ui/sla-progress";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import type { TicketRow } from "@/components/ticket-table";

function slaPercent(ticket: TicketRow) {
  if (ticket.slaState === "BREACHED") return 20;
  if (ticket.slaState === "AT_RISK") return 50;
  if (ticket.slaState === "PAUSED") return 80;
  return ticket.slaState === "OK" ? 80 : 100;
}

function slaTone(ticket: TicketRow) {
  if (ticket.slaState === "BREACHED") return "overdue" as const;
  if (ticket.slaState === "AT_RISK") return "attention" as const;
  return "normal" as const;
}

export function TicketTable({ tickets, empty = "Aucun ticket à afficher." }: { tickets: TicketRow[]; empty?: string }) {
  const columns: DataTableColumn<TicketRow>[] = [
    { key: "title", header: "Sujet", sortable: true, cell: (ticket) => <div><Link href={("/tickets/" + ticket.id) as Route} className="ticket-reference-link font-semibold hover:underline">{ticket.reference}</Link><p className="ticket-table-title">{ticket.title}</p><p className="ticket-table-meta">{ticket.requester.name}</p></div> },
    { key: "requester", header: "Client", cell: (ticket) => ticket.requester.name },
    { key: "status", header: "Statut", cell: (ticket) => <StatusBadge status={ticket.status} /> },
    { key: "priority", header: "Priorité", cell: (ticket) => <PriorityBadge priority={ticket.priority} /> },
    { key: "sla", header: "SLA", cell: (ticket) => <SlaProgress value={slaPercent(ticket)} tone={slaTone(ticket)} label="SLA" /> },
    { key: "updatedAt", header: "Mis à jour", cell: (ticket) => <Badge tone="neutral">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(ticket.updatedAt)}</Badge> },
  ];

  return <DataTable columns={columns} data={tickets} getRowKey={(ticket) => ticket.id} emptyState={empty} caption="Liste des tickets" className="ticket-reference-table" />;
}
