import { RoleCode, TicketStatus } from "@prisma/client";
import { DashboardHeader } from "@/components/modules/dashboard/dashboard-header";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { RecentTicketsCard } from "@/components/dashboard/recent-tickets-card";
import { SlaOverviewCard } from "@/components/dashboard/sla-overview-card";
import { DashboardActivity } from "@/components/dashboard/dashboard-activity";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { getRequesterTicketSummary, listVisibleTickets } from "@/lib/ticket-query-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";

export default async function DashboardPage() {
  const user = await getSessionUserContext();
  if (!user) return null;

  const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];
  const canOperate = roleCodes(user).some((role) => operationalRoles.includes(role));
  const canReport = permissionCodes(user).includes("reporting:read");
  const [personalTickets, statusCounts] = await Promise.all([
    listVisibleTickets(user, { scope: "requested", take: 100 }),
    getRequesterTicketSummary(user),
  ]);
  const personalOpen = ([TicketStatus.NEW, TicketStatus.TO_QUALIFY, TicketStatus.TO_ASSIGN, TicketStatus.ASSIGNED, TicketStatus.REOPENED] as TicketStatus[])
    .reduce((total, status) => total + statusCounts[status], 0);
  const personalInProgress = statusCounts[TicketStatus.IN_PROGRESS];
  const personalClosed = statusCounts[TicketStatus.CLOSED];

  return (
    <div className="dashboard-page dashboard-requester-layout">
      <DashboardHeader firstName={user.name.split(" ")[0]} canOperate={canOperate} canReport={canReport} />
      <DashboardKpiGrid values={{ open: personalOpen, inProgress: personalInProgress, resolved: personalClosed, atRisk: personalTickets.filter((ticket) => ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED").length }} />
      <RecentTicketsCard tickets={personalTickets} />
      <div className="dashboard-enterprise-two-column"><SlaOverviewCard tickets={personalTickets} /><DashboardActivity tickets={personalTickets} /></div>
      <div className="dashboard-enterprise-two-column dashboard-enterprise-actions-row"><QuickActionsCard canOperate={canOperate} canReport={canReport} /><section className="dashboard-enterprise-card dashboard-enterprise-placeholder" aria-label="Charge opérationnelle"><p className="eyebrow">Supervision</p><h2>Charge opérationnelle</h2><p>Les indicateurs de charge apparaîtront ici dès que votre périmètre contient des files opérationnelles.</p></section></div>
    </div>
  );
}
