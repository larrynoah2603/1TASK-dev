import Link from "next/link";
import { RoleCode } from "@prisma/client";
import { TicketTable } from "@/components/ticket-table";
import { TicketFilters } from "@/components/ticket-filters";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { TicketCursorPagination } from "@/components/ticket-cursor-pagination";
import { TicketWorkspace, TicketWorkspaceHeader, TicketWorkspaceToolbar } from "@/components/tickets/ticket-workspace";
import { listVisibleTicketsPage } from "@/lib/ticket-query-service";
import { listTicketQueueFilterOptions } from "@/lib/ticket-queue-service";
import { getSessionUserContext, roleCodes } from "@/lib/server-auth";
import { ticketListQuerySchema } from "@/lib/validation";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getSessionUserContext();
  if (!user) return null;
  const rawParams = await searchParams;
  const params = ticketListQuerySchema.parse({ ...rawParams, scope: rawParams.scope ?? "requested" });
  const [queues, tickets] = await Promise.all([
    listTicketQueueFilterOptions(user, { includePersonal: true }),
    listVisibleTicketsPage(user, { query: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, sort: params.sort, cursor: params.cursor, pageSize: params.pageSize }, { includeTotal: false }),
  ]);
  const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];
  const operational = roleCodes(user).some((role) => operationalRoles.includes(role));

  return (
    <TicketWorkspace>
      <TicketWorkspaceHeader><div><p className="eyebrow">Ticket Workspace</p><h1>Tickets</h1><p className="page-header-description">Gérez vos demandes et interventions.</p></div><Link href="/tickets/new" className="button-primary">Créer un ticket</Link></TicketWorkspaceHeader>
      {operational ? <TicketViewSwitcher basePath="/inbox" scope="requested" includeRequested /> : null}
      <TicketWorkspaceToolbar><TicketFilters queues={queues} values={params} scopeOptions={["requested"]} /></TicketWorkspaceToolbar>
      <TicketTable tickets={tickets.tickets} showActions={false} empty="Vous n’avez encore créé aucun ticket." />
      <TicketCursorPagination basePath="/tickets" query={{ q: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, sort: params.sort, pageSize: String(params.pageSize) }} currentCursor={params.cursor} nextCursor={tickets.nextCursor} itemCount={tickets.tickets.length} pageSize={tickets.pageSize} />
    </TicketWorkspace>
  );
}
