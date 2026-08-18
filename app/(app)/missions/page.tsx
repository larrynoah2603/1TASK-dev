import { redirect } from "next/navigation";
import { MissionListClient } from "@/components/mission-list-client";
import { AutoRefresh } from "@/components/auto-refresh";
import { getProductionTimestamp, listMissionsForViewer } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";

export default async function MissionsPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!permissionCodes(user).includes("portfolio:read")) redirect("/dashboard");

  const missions = await listMissionsForViewer(user);
  const serializableMissions = missions.map((mission) => ({
    id: mission.id,
    code: mission.code,
    name: mission.name,
    status: mission.status,
    dueAt: mission.dueAt?.toISOString() ?? null,
    budgetMinutes: mission.budgetMinutes,
    worklogMinutes: mission.worklogMinutes,
    department: mission.department,
    dossier: {
      id: mission.dossier.id,
      code: mission.dossier.code,
      name: mission.dossier.name,
      client: mission.dossier.client,
    },
    _count: mission._count,
  }));

  return (
    <div className="space-y-5">
      <AutoRefresh intervalMs={30000} />
      <header className="page-header">
        <div>
          <p className="eyebrow">Portefeuille de production</p>
          <h1 className="mt-1">Missions</h1>
          <p className="page-header-description mt-1">Suivez les missions autorisées, leurs échéances, leur budget et les tickets associés.</p>
        </div>
      </header>
      <MissionListClient initialMissions={serializableMissions} nowTimestamp={getProductionTimestamp()} />
    </div>
  );
}
