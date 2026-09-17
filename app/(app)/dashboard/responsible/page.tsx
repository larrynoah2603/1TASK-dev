import { redirect } from "next/navigation";
import { DashboardViewTabs, ResponsibleDashboard } from "@/components/dashboard-visuals";
import { getReportingSummary } from "@/lib/reporting-service";
import { listVisibleTickets } from "@/lib/ticket-query-service";
import { listVisibleQueues } from "@/lib/ticket-queue-service";
import { getMissionPortfolioSummary, getProductionTimestamp, listMissionsForViewer } from "@/lib/production-service";
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
  const [summary, queues, tickets, missionData] = await Promise.all([
    getReportingSummary(user),
    listVisibleQueues(user),
    listVisibleTickets(user, { mode: "REPORTING", workQueue: true, sla: "attention", take: 8, sort: "updated_desc" }),
    canPortfolio ? Promise.all([
      getMissionPortfolioSummary(user),
      listMissionsForViewer(user, { take: 12 }),
    ]) : Promise.resolve([null, []] as const),
  ]);
  const [missionSummary, missions] = missionData;
  const nowTimestamp = getProductionTimestamp();

  return (
    <div className="dashboard-page">
      <DashboardViewTabs active="responsible" canOperate={canOperate} canReport />
      <ResponsibleDashboard queues={queues} summary={summary} tickets={tickets} missionSummary={missionSummary ?? undefined} missions={missions.map((mission) => ({ ...mission, isLate: Boolean(mission.dueAt && mission.dueAt.getTime() < nowTimestamp && !["COMPLETED", "ARCHIVED"].includes(mission.status)) }))} />
    </div>
  );
}
