import { RoleCode, TicketStatus } from "@prisma/client";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { getRequesterTicketSummary, listVisibleTickets } from "@/lib/ticket-query-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";

export default async function DashboardRoute() {
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

  return <DashboardPage firstName={user.name.split(" ")[0]} kpis={{ open: personalOpen, inProgress: personalInProgress, resolved: personalClosed, atRisk: personalTickets.filter((ticket) => ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED").length }} tickets={personalTickets} />;
}
