import Link from "next/link";
import { RoleCode } from "@prisma/client";
import { TicketTable } from "@/components/ticket-table";
import { TicketFilters } from "@/components/ticket-filters";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { Pagination } from "@/components/pagination";
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
    listVisibleTicketsPage(user, { query: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, sort: params.sort, page: params.page, pageSize: params.pageSize }),
  ]);
  const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];
  const operational = roleCodes(user).some((role) => operationalRoles.includes(role));

  return (
    <div className="ticket-register-page space-y-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Demandeur</p>
          <h1 className="mt-2">Mes tickets</h1>
          <p className="page-header-description mt-2">Retrouvez les demandes créées avec votre identité Entra, leur routage, leur état et leur échéance SLA.</p>
        </div>
        <Link href="/tickets/new" className="button-primary page-header-actions">+ Nouveau ticket</Link>
      </header>
      {operational ? <TicketViewSwitcher basePath="/inbox" scope="requested" includeRequested /> : null}
      <TicketFilters queues={queues} values={params} scopeOptions={["requested"]} />
      <TicketTable tickets={tickets.tickets} showActions={false} empty="Vous n’avez encore créé aucun ticket." />
      <Pagination basePath="/tickets" query={{ q: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, sort: params.sort, pageSize: String(params.pageSize) }} page={tickets.page} totalPages={tickets.totalPages} total={tickets.total} pageSize={tickets.pageSize} />
    </div>
  );
}
