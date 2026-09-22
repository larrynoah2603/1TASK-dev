import { RoleCode, TicketStatus } from "@prisma/client";
import { DashboardHeader } from "@/components/modules/dashboard/dashboard-header";
import { MetricGrid } from "@/components/modules/dashboard/metric-card";
import { RecentTickets } from "@/components/modules/dashboard/recent-tickets";
import { SlaSummary } from "@/components/modules/dashboard/sla-summary";
import { CreateTicketCard } from "@/components/modules/dashboard/create-ticket-card";
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
  const personalBlocked = statusCounts[TicketStatus.BLOCKED];
  const personalClosed = statusCounts[TicketStatus.CLOSED];

  return (
    <div className="dashboard-page dashboard-requester-layout">
      <DashboardHeader firstName={user.name.split(" ")[0]} canOperate={canOperate} canReport={canReport} />
      <CreateTicketCard />
      <MetricGrid metrics={[{ label: "Ouverts", value: personalOpen, note: "à qualifier ou affecter", href: "/tickets?status=NEW", tone: "dashboard-kpi-value-brand" }, { label: "En cours", value: personalInProgress, note: "traitement en cours", href: "/tickets?status=IN_PROGRESS", tone: "dashboard-kpi-value-info" }, { label: "Bloqués", value: personalBlocked, note: "information attendue", href: "/tickets?status=BLOCKED", tone: "dashboard-kpi-value-warning" }, { label: "Résolus", value: personalClosed, note: "historique personnel", href: "/tickets?status=CLOSED", tone: "dashboard-kpi-value-success" }]} />
      <SlaSummary tickets={personalTickets} />
      <RecentTickets tickets={personalTickets} />
    </div>
  );
}
