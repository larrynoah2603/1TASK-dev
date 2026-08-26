import { AdminConfigurationPanel } from "@/components/admin-configuration-panel";
import { AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminQueuesPage() {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const configuration = await getAdminConfiguration(admin, ["queues"]);
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Hiérarchie opérationnelle" title="Files et responsables" description="Chaque file est rattachée à un département et possède un responsable applicatif distinct du manager hiérarchique Entra ID." />
      <AdminConfigurationPanel configuration={configuration} sections={["queues"]} />
    </div>
  );
}
