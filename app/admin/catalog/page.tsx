import { AdminConfigurationPanel } from "@/components/admin-configuration-panel";
import { AdminNotice, AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const raw = await searchParams;
  const filter = raw.queueId;
  const configuration = await getAdminConfiguration(admin, ["catalog"]);
  if (filter) configuration.services = configuration.services.filter((service) => service.queue.id === filter);
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Routage automatique" title="Catalogue de services" description="Le catalogue détermine la catégorie, la nature, le département opérationnel, la file, la priorité par défaut et le SLA des nouveaux tickets." />
      <AdminNotice>Une modification du catalogue s’applique uniquement aux nouveaux tickets. Les tickets existants conservent leur routage, leur historique et leurs échéances SLA.</AdminNotice>
      <AdminConfigurationPanel configuration={configuration} sections={["catalog"]} />
    </div>
  );
}
