import type { TicketRow } from "@/components/ticket-table";
import { TicketCursorPagination } from "@/components/ticket-cursor-pagination";
import { TicketsHeader } from "./tickets-header";
import { TicketsTable } from "./tickets-table";
import { TicketsToolbar } from "./tickets-toolbar";
import type { TicketFilter } from "./ticket-filter";

type Props = { tickets: TicketRow[]; queues: Parameters<typeof TicketFilter>[0]["queues"]; values: Parameters<typeof TicketFilter>[0]["values"]; nextCursor: string | null; currentCursor?: string; pageSize: number };

export function TicketsPage({ tickets, queues, values, nextCursor, currentCursor, pageSize }: Props) {
  return <div className="tickets-modern-page"><TicketsHeader count={tickets.length} /><TicketsToolbar queues={queues} values={values} /><TicketsTable tickets={tickets} empty="Vous n’avez encore créé aucun ticket." /><TicketCursorPagination basePath="/tickets" query={{ q: values.q, status: values.status, priority: values.priority, scope: values.scope, sla: values.sla, departmentId: values.departmentId, queueId: values.queueId, sort: values.sort, pageSize: String(pageSize) }} currentCursor={currentCursor} nextCursor={nextCursor} itemCount={tickets.length} pageSize={pageSize} /></div>;
}
