import { redirect } from "next/navigation";
import { DossierListClient } from "@/components/dossier-list-client";
import { listClientAccounts, listDossiersForViewer } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";

export default async function DossiersPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const permissions = permissionCodes(user);
  if (!permissions.includes("portfolio:read")) redirect("/dashboard");

  const canManage = permissions.includes("portfolio:manage");
  const [dossiers, clients] = await Promise.all([
    listDossiersForViewer(user),
    canManage ? listClientAccounts(user) : Promise.resolve([]),
  ]);

  const serializableDossiers = dossiers.map((dossier) => ({
    id: dossier.id,
    code: dossier.code,
    name: dossier.name,
    confidential: dossier.confidential,
    updatedAt: dossier.updatedAt.toISOString(),
    client: dossier.client,
    missions: dossier.missions.map((mission) => ({
      id: mission.id,
      code: mission.code,
      name: mission.name,
      status: mission.status,
      dueAt: mission.dueAt?.toISOString() ?? null,
      department: mission.department,
    })),
  }));

  return (
    <div className="space-y-5">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portefeuille de production</p>
          <h1 className="mt-1">Dossiers clients</h1>
          <p className="page-header-description mt-1">Consultez les dossiers autorisés, leurs missions et leur rattachement au ticketing.</p>
        </div>
      </header>
      <DossierListClient initialDossiers={serializableDossiers} clients={clients} canManage={canManage} />
    </div>
  );
}
