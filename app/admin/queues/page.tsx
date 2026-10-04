import { AdminConfigurationPanel } from "@/components/admin-configuration-panel";
import { AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";
import { getProductCapabilities } from "@/lib/product-policy.server";

export default async function AdminQueuesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const raw = await searchParams;
  const filter = raw.departmentId;
  const capabilities = getProductCapabilities();
  const sections = capabilities.productionPortfolio ? ["queues"] as const : ["queues", "teams"] as const;
  const configuration = await getAdminConfiguration(admin, [...sections]);
  if (filter) configuration.queues = configuration.queues.filter((queue) => queue.department.id === filter);
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Hiérarchie opérationnelle" title="Files et responsables" description="Chaque file est rattachée à un département et possède un responsable applicatif distinct du manager hiérarchique Entra ID." />
      <AdminConfigurationPanel configuration={configuration} sections={[...sections]} autoAssignmentEnabled={capabilities.autoAssignment} />
    </div>
  );
}
