import { redirect } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { DashboardKpiGrid, DashboardViewTabs, OperationsTicketTable, OperationsWatchPanel } from "@/components/dashboard-visuals";
import { TicketFilters } from "@/components/ticket-filters";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { Pagination } from "@/components/pagination";
import { canActorClaimTicket, listVisibleQueues, listVisibleTickets, listVisibleTicketsPage } from "@/lib/ticket-service";
import { listDossiersForViewer, listMissionsForViewer } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";
import { ticketListQuerySchema } from "@/lib/validation";

const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!roleCodes(user).some((role) => operationalRoles.includes(role))) redirect("/tickets");

  const rawParams = await searchParams;
  const params = ticketListQuerySchema.parse({ ...rawParams, scope: rawParams.scope ?? "all" });
  const canPortfolio = permissionCodes(user).includes("portfolio:read");
  const [queues, ticketPage, allOperational, portfolioOptions] = await Promise.all([
    listVisibleQueues(user),
    listVisibleTicketsPage(user, { page: params.page, pageSize: params.pageSize, sort: params.sort, workQueue: true, query: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, dossierId: params.dossierId, missionId: params.missionId }),
    listVisibleTickets(user, { workQueue: true, take: 100, sort: "updated_desc" }),
    canPortfolio ? Promise.all([listDossiersForViewer(user), listMissionsForViewer(user)]) : Promise.resolve([[], []] as const),
  ]);
  const [dossiers, missions] = portfolioOptions;

  const activeOperational = allOperational.filter((ticket) => ticket.status !== "CLOSED");
  const currentRows = ticketPage.tickets.filter((ticket) => ticket.status !== "CLOSED");
  const unassignedCount = activeOperational.filter((ticket) => !ticket.assignedTo).length;
  const mineCount = activeOperational.filter((ticket) => ticket.assignedTo?.id === user.id).length;
  const slaAttention = activeOperational.filter((ticket) => ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED");
  const claimableTicketIds = currentRows.filter((ticket) => canActorClaimTicket(user, ticket)).map((ticket) => ticket.id);
  const canReport = permissionCodes(user).includes("reporting:read");

  return (
    <div data-ui-family="ticketing" className="dashboard-page dashboard-operations-layout">
      <DashboardViewTabs active="operations" canOperate canReport={canReport} />
      <header className="dashboard-hero dashboard-role-hero">
        <div><p className="eyebrow">Opérations</p><h1>File opérationnelle</h1><p className="page-header-description">Tickets à traiter dans votre périmètre.</p></div>
        <span className="dashboard-hero-counter">{activeOperational.length} actifs</span>
      </header>

      <DashboardKpiGrid items={[{ label: "Non affectés", value: unassignedCount, note: "à prendre en charge", href: "/inbox?scope=unassigned", tone: "dashboard-kpi-value-brand", icon: "◫" }, { label: "Mes tickets", value: mineCount, note: "affectés à votre profil", href: "/inbox?scope=mine", tone: "dashboard-kpi-value-info", icon: "▣" }, { label: "SLA à surveiller", value: slaAttention.length, note: "proches ou dépassés", href: "/inbox?sla=attention", tone: slaAttention.length ? "dashboard-kpi-value-warning" : "dashboard-kpi-value-success", icon: "!" }, { label: "SLA dépassés", value: slaAttention.filter((ticket) => ticket.slaState === "BREACHED").length, note: "escalades prioritaires", href: "/inbox?sla=breached", tone: "dashboard-kpi-value-danger", icon: "!" }]} />

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
