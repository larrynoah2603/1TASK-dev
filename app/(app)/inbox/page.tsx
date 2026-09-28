import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { DashboardViewTabs } from "@/components/dashboard-visuals";
import { AgentKpiGrid } from "@/components/inbox/agent-kpi-grid";
import { SlaMonitorPanel } from "@/components/inbox/sla-monitor-panel";
import { AgentActivity } from "@/components/inbox/agent-activity";
import { InboxAgentPanel } from "@/components/inbox/inbox-agent-panel";
import { InboxPage as InboxWorkspace } from "@/components/inbox/inbox-page";
import { TicketFilters } from "@/components/ticket-filters";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { TicketCursorPagination } from "@/components/ticket-cursor-pagination";
import { canActorClaimTicket } from "@/lib/ticket-service";
import { getOperationalTicketSummary, listVisibleTickets, listVisibleTicketsPage } from "@/lib/ticket-query-service";
import { listVisibleQueueFilterOptions } from "@/lib/ticket-queue-service";
import { listTicketPortfolioFilterOptions } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";
import { measureServerOperation } from "@/lib/performance";
import { ticketListQuerySchema } from "@/lib/validation";

const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];

async function InboxKpis({ user }: { user: NonNullable<Awaited<ReturnType<typeof getSessionUserContext>>> }) {
  const summary = await measureServerOperation("inbox.summary", () => getOperationalTicketSummary(user), { route: "/inbox", section: "secondary" });
  return <AgentKpiGrid summary={{ ...summary, waiting: 0 }} />;
}

async function InboxSlaWatch({ user }: { user: NonNullable<Awaited<ReturnType<typeof getSessionUserContext>>> }) {
  const tickets = await measureServerOperation("inbox.sla_watch", () => listVisibleTickets(user, { workQueue: true, sla: "attention", take: 6, sort: "updated_desc" }), { route: "/inbox", section: "secondary" });
  return <SlaMonitorPanel tickets={tickets} />;
}

function InboxKpiSkeleton() { return <div className="inbox-skeleton-kpis" aria-label="Chargement des indicateurs"><div /><div /><div /><div /></div>; }
function InboxWatchSkeleton() { return <div className="inbox-skeleton-table" aria-label="Chargement de la surveillance SLA" />; }

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!roleCodes(user).some((role) => operationalRoles.includes(role))) redirect("/tickets");

  const rawParams = await searchParams;
  const params = ticketListQuerySchema.parse({ ...rawParams, scope: rawParams.scope ?? "all" });
  const canPortfolio = permissionCodes(user).includes("portfolio:read");
  const [queues, ticketPage, portfolioOptions] = await Promise.all([
    measureServerOperation("inbox.queue_filters", () => listVisibleQueueFilterOptions(user), { route: "/inbox", section: "critical" }),
    measureServerOperation("inbox.ticket_page", () => listVisibleTicketsPage(user, { cursor: params.cursor, pageSize: params.pageSize, sort: params.sort, workQueue: true, query: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, dossierId: params.dossierId, missionId: params.missionId }, { includeTotal: false }), { route: "/inbox", section: "critical" }),
    canPortfolio
      ? measureServerOperation("inbox.portfolio_filters", () => listTicketPortfolioFilterOptions(user), { route: "/inbox", section: "filters" })
      : Promise.resolve([[], []] as const),
  ]);
  const [dossiers, missions] = portfolioOptions;

  const currentRows = ticketPage.tickets.filter((ticket) => ticket.status !== "CLOSED");
  const claimableTicketIds = currentRows.filter((ticket) => canActorClaimTicket(user, ticket)).map((ticket) => ticket.id);
  const canReport = permissionCodes(user).includes("reporting:read");
  const waiting = currentRows.filter((ticket) => ticket.status === "BLOCKED" || ticket.status === "RESOLUTION_PENDING").length;
  return (
    <InboxWorkspace
      tickets={currentRows}
      claimableTicketIds={claimableTicketIds}
      navigation={<DashboardViewTabs active="operations" canOperate canReport={canReport} />}
      kpis={<Suspense fallback={<InboxKpiSkeleton />}><InboxKpis user={user} /></Suspense>}
      filters={<><TicketViewSwitcher scope={params.scope} sla={params.sla} basePath="/inbox" /><TicketFilters queues={queues} dossiers={dossiers} missions={missions} values={params} resetHref="/inbox" scopeOptions={["all", "unassigned", "mine", "team"]} /></>}
      pagination={<TicketCursorPagination basePath="/inbox" query={{ q: params.q, status: params.status, priority: params.priority, scope: params.scope, sla: params.sla, departmentId: params.departmentId, queueId: params.queueId, dossierId: params.dossierId, missionId: params.missionId, sort: params.sort, pageSize: String(params.pageSize) }} currentCursor={params.cursor} nextCursor={ticketPage.nextCursor} itemCount={currentRows.length} pageSize={ticketPage.pageSize} />}
      agentPanel={<InboxAgentPanel><Suspense fallback={<InboxWatchSkeleton />}><InboxSlaWatch user={user} /></Suspense><AgentActivity tickets={currentRows} /></InboxAgentPanel>}
    />
  );
}
