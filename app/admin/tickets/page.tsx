import { redirect } from "next/navigation";
import { getProductCapabilities } from "@/lib/product-policy.server";
import Link from "next/link";
import { TicketTable } from "@/components/ticket-table";
import { TicketFilters } from "@/components/ticket-filters";
import { AdminNotice, AdminPageHeader } from "@/components/admin-primitives";
import { Pagination } from "@/components/pagination";
import { listVisibleTicketsPage } from "@/lib/ticket-query-service";
import { listVisibleQueues } from "@/lib/ticket-queue-service";
import { requireAdminAccess } from "@/lib/server-auth";
import { ticketListQuerySchema } from "@/lib/validation";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdminAccess("FUNCTIONAL");
  if (!getProductCapabilities().productionPortfolio) redirect("/tickets");
  const raw = await searchParams;
  const params = ticketListQuerySchema.parse({ ...raw, scope: "all" });
  const [queues, ticketPage] = await Promise.all([
    listVisibleQueues(admin),
    listVisibleTicketsPage(admin, {
      workQueue: true,
      page: params.page,
      pageSize: params.pageSize,
      sort: params.sort,
      query: params.q,
      status: params.status,
      priority: params.priority,
      sla: params.sla,
      departmentId: params.departmentId,
      queueId: params.queueId,
    }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Supervision opérationnelle" title="Tickets autorisés" description="Supervisez les tickets non confidentiels couverts par votre périmètre. Les actions de réaffectation et de réorientation restent celles du workflow sécurisé et exigent une justification." actions={<Link href="/inbox" className="button-secondary">Ouvrir la boîte opérationnelle</Link>} />
      <AdminNotice tone="warning">Les tickets confidentiels qui ne vous sont pas explicitement autorisés ne sont ni comptés ni affichés. Connaître une référence ou un identifiant ne suffit jamais à obtenir l’accès.</AdminNotice>
      <TicketFilters compact queues={queues} values={params} resetHref="/admin/tickets" scopeOptions={[]} />
      <TicketTable tickets={ticketPage.tickets} showActions={false} empty="Aucun ticket autorisé ne correspond à ces critères." />
      <Pagination basePath="/admin/tickets" query={{ q: params.q, status: params.status, priority: params.priority, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, sort: params.sort, pageSize: String(params.pageSize) }} page={ticketPage.page} totalPages={ticketPage.totalPages} total={ticketPage.total} pageSize={ticketPage.pageSize} />
    </div>
  );
}
