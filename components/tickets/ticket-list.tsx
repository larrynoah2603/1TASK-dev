import { TicketFilter } from "@/components/tickets/ticket-filter";
import { TicketTable } from "@/components/tickets/ticket-table";
import { TicketCursorPagination } from "@/components/ticket-cursor-pagination";
import { TicketWorkspace, TicketWorkspaceHeader, TicketWorkspaceToolbar } from "@/components/tickets/ticket-workspace";
import type { TicketRow } from "@/components/ticket-table";

export function TicketList({ tickets, queues, values, nextCursor, currentCursor, pageSize }: { tickets: TicketRow[]; queues: Parameters<typeof TicketFilter>[0]["queues"]; values: Parameters<typeof TicketFilter>[0]["values"]; nextCursor: string | null; currentCursor?: string; pageSize: number }) {
  return <TicketWorkspace>
    <TicketWorkspaceHeader><div><p className="eyebrow">Service Desk</p><h1>Tickets</h1><p className="page-header-description">Gérez et suivez vos demandes.</p></div></TicketWorkspaceHeader>
    <TicketWorkspaceToolbar><TicketFilter queues={queues} values={values} scopeOptions={["requested"]} /></TicketWorkspaceToolbar>
    <section className="ticket-reference-list" aria-label="Liste des tickets"><TicketTable tickets={tickets} empty="Vous n’avez encore créé aucun ticket." /></section>
    <TicketCursorPagination basePath="/tickets" query={{ q: values.q, status: values.status, priority: values.priority, scope: values.scope, sla: values.sla, departmentId: values.departmentId, queueId: values.queueId, sort: values.sort, pageSize: String(pageSize) }} currentCursor={currentCursor} nextCursor={nextCursor} itemCount={tickets.length} pageSize={pageSize} />
  </TicketWorkspace>;
}
