import { AdminConfigurationPanel } from "@/components/admin-configuration-panel";
import { AdminNotice, AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminDepartmentsPage() {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const configuration = await getAdminConfiguration(admin);
  return (
    <div className="space-y-6">
    <AdminPageHeader eyebrow="Organisation" title="Départements et référentiel Entra ID" description="Gérez les départements internes et le référentiel des valeurs brutes reçues de Microsoft Entra ID. L’affectation du département d’un utilisateur se fait dans /admin/users." />
      <AdminNotice tone="warning">Le référentiel Entra conserve les valeurs brutes et ne modifie pas automatiquement les profils. Le département interne d’un utilisateur se choisit et se valide exclusivement dans /admin/users.</AdminNotice>
      <AdminConfigurationPanel configuration={configuration} sections={["departments"]} />
    </div>
  );
}
