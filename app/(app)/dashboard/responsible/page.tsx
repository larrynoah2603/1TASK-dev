import { redirect } from "next/navigation";
import { DashboardViewTabs, ResponsibleDashboard } from "@/components/dashboard-visuals";
import { AutoRefresh } from "@/components/auto-refresh";
import { getReportingSummary } from "@/lib/reporting-service";
import { listVisibleQueues, listVisibleTickets } from "@/lib/ticket-service";
import { getProductionTimestamp, listMissionsForViewer } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";
import { RoleCode } from "@prisma/client";

const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];

export default async function DashboardResponsiblePage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const canReport = permissionCodes(user).includes("reporting:read");
  if (!canReport) redirect("/dashboard");

  const canOperate = roleCodes(user).some((role) => operationalRoles.includes(role));
  const canPortfolio = permissionCodes(user).includes("portfolio:read");
  const [summary, queues, tickets, missions] = await Promise.all([
    getReportingSummary(user),
    listVisibleQueues(user),
    listVisibleTickets(user, { mode: "REPORTING", workQueue: true, take: 100, sort: "updated_desc" }),
    canPortfolio ? listMissionsForViewer(user) : Promise.resolve([]),
  ]);
  const nowTimestamp = getProductionTimestamp();

  return (
    <div className="dashboard-page">
      <AutoRefresh intervalMs={15000} />
      <DashboardViewTabs active="responsible" canOperate={canOperate} canReport />
      <ResponsibleDashboard queues={queues} summary={summary} tickets={tickets} missions={missions.map((mission) => ({ ...mission, isLate: Boolean(mission.dueAt && mission.dueAt.getTime() < nowTimestamp && !["COMPLETED", "ARCHIVED"].includes(mission.status)) }))} />
    </div>
  );
}
