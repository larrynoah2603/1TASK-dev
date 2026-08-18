import { AdminConfigurationPanel } from "@/components/admin-configuration-panel";
import { AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminTeamsPage() {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const configuration = await getAdminConfiguration(admin);
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Hiérarchie opérationnelle" title="Équipes et agents" description="Associez les équipes aux files et les agents actifs aux équipes autorisées. L’appartenance à une équipe ne crée jamais le rôle AGENT à elle seule." />
      <AdminConfigurationPanel configuration={configuration} sections={["teams"]} />
    </div>
  );
}
