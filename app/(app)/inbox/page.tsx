import { redirect } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { DashboardKpiGrid, DashboardViewTabs, OperationsTicketTable, OperationsWatchPanel } from "@/components/dashboard-visuals";
import { TicketFilters } from "@/components/ticket-filters";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { Pagination } from "@/components/pagination";
import { canActorClaimTicket, getOperationalTicketSummary, listVisibleQueueFilterOptions, listVisibleTickets, listVisibleTicketsPage } from "@/lib/ticket-service";
import { listTicketPortfolioFilterOptions } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";
import { measureServerOperation } from "@/lib/performance";
import { ticketListQuerySchema } from "@/lib/validation";

const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!roleCodes(user).some((role) => operationalRoles.includes(role))) redirect("/tickets");

  const rawParams = await searchParams;
  const params = ticketListQuerySchema.parse({ ...rawParams, scope: rawParams.scope ?? "all" });
  const canPortfolio = permissionCodes(user).includes("portfolio:read");
  const [queues, ticketPage, operationalSummary, slaTickets, portfolioOptions] = await Promise.all([
    measureServerOperation("inbox.queue_filters", () => listVisibleQueueFilterOptions(user), { route: "/inbox" }),
    measureServerOperation("inbox.ticket_page", () => listVisibleTicketsPage(user, { page: params.page, pageSize: params.pageSize, sort: params.sort, workQueue: true, query: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, dossierId: params.dossierId, missionId: params.missionId }), { route: "/inbox" }),
    measureServerOperation("inbox.summary", () => getOperationalTicketSummary(user), { route: "/inbox" }),
    measureServerOperation("inbox.sla_watch", () => listVisibleTickets(user, { workQueue: true, sla: "attention", take: 6, sort: "updated_desc" }), { route: "/inbox" }),
    canPortfolio
      ? measureServerOperation("inbox.portfolio_filters", () => listTicketPortfolioFilterOptions(user), { route: "/inbox" })
      : Promise.resolve([[], []] as const),
  ]);
  const [dossiers, missions] = portfolioOptions;

  const currentRows = ticketPage.tickets.filter((ticket) => ticket.status !== "CLOSED");
  const unassignedCount = operationalSummary.unassigned;
  const mineCount = operationalSummary.mine;
  const slaAttention = slaTickets.filter((ticket) => ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED");
  const claimableTicketIds = currentRows.filter((ticket) => canActorClaimTicket(user, ticket)).map((ticket) => ticket.id);
  const canReport = permissionCodes(user).includes("reporting:read");

  return (
    <div className="dashboard-page dashboard-operations-layout inbox-operations-industrial">
      <DashboardViewTabs active="operations" canOperate canReport={canReport} />
      <header className="dashboard-hero dashboard-role-hero">
        <div><p className="eyebrow">Opérations</p><h1>File opérationnelle</h1><p className="page-header-description">Tickets à traiter dans votre périmètre.</p></div>
        <span className="dashboard-hero-counter">{operationalSummary.active} actifs</span>
      </header>

      <DashboardKpiGrid items={[{ label: "Non affectés", value: unassignedCount, note: "à prendre en charge", href: "/inbox?scope=unassigned", tone: "dashboard-kpi-value-brand" }, { label: "Mes tickets", value: mineCount, note: "affectés à votre profil", href: "/inbox?scope=mine", tone: "dashboard-kpi-value-info" }, { label: "SLA à surveiller", value: operationalSummary.slaAttention, note: "proches ou dépassés", href: "/inbox?sla=attention", tone: operationalSummary.slaAttention ? "dashboard-kpi-value-warning" : "dashboard-kpi-value-success" }, { label: "SLA dépassés", value: operationalSummary.slaBreached, note: "escalades prioritaires", href: "/inbox?sla=breached", tone: "dashboard-kpi-value-danger" }]} />

      <div className="dashboard-operations-grid">
        <section className="dashboard-widget dashboard-operations-table-card" aria-labelledby="operations-table-title">
          <div className="dashboard-widget-header"><div><p className="eyebrow">Boîte agent</p><h2 id="operations-table-title">Tickets à traiter</h2></div><span className="dashboard-widget-total">{ticketPage.total} visibles</span></div>
          <TicketViewSwitcher scope={params.scope} sla={params.sla} basePath="/inbox" />
          <TicketFilters queues={queues} dossiers={dossiers} missions={missions} values={params} resetHref="/inbox" scopeOptions={["all", "unassigned", "mine", "team"]} />
          <OperationsTicketTable tickets={currentRows} claimableTicketIds={claimableTicketIds} />
          <Pagination basePath="/inbox" query={{ q: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, dossierId: params.dossierId, missionId: params.missionId, sort: params.sort, pageSize: String(params.pageSize) }} page={ticketPage.page} totalPages={ticketPage.totalPages} total={ticketPage.total} pageSize={ticketPage.pageSize} />
        </section>
        <OperationsWatchPanel tickets={slaAttention} />
      </div>
    </div>
  );
}
