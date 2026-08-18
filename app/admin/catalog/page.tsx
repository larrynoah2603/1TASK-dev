import { AdminConfigurationPanel } from "@/components/admin-configuration-panel";
import { AdminNotice, AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminCatalogPage() {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const configuration = await getAdminConfiguration(admin);
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Routage automatique" title="Catalogue de services" description="Le catalogue détermine la catégorie, la nature, le département opérationnel, la file, la priorité par défaut et le SLA des nouveaux tickets." />
      <AdminNotice>Une modification du catalogue s’applique uniquement aux nouveaux tickets. Les tickets existants conservent leur routage, leur historique et leurs échéances SLA.</AdminNotice>
      <AdminConfigurationPanel configuration={configuration} sections={["catalog"]} />
    </div>
  );
}
