import { RoleCode } from "@prisma/client";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { TicketList } from "@/components/tickets/ticket-list";
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

  return <>
    {operational ? <TicketViewSwitcher basePath="/inbox" scope="requested" includeRequested /> : null}
    <TicketList queues={queues} values={params} tickets={tickets.tickets} currentCursor={params.cursor ?? undefined} nextCursor={tickets.nextCursor} pageSize={tickets.pageSize} />
  </>;
}
