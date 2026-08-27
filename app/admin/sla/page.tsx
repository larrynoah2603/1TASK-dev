import { AdminConfigurationPanel } from "@/components/admin-configuration-panel";
import { AdminNotice, AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminSlaPage() {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const configuration = await getAdminConfiguration(admin, ["sla"]);
  return (
    <div className="space-y-6 admin-sla-industrial sla-reporting-industrial">
      <AdminPageHeader eyebrow="Qualité de service" title="SLA, calendriers et escalades" description="Définissez les délais de première réponse, de résolution, les calendriers actifs et les seuils d’escalade." />
      <AdminNotice>Une réaffectation ou une réorientation ne réinitialise jamais les échéances SLA des tickets existants.</AdminNotice>
      <AdminConfigurationPanel configuration={configuration} sections={["sla"]} />
    </div>
  );
}
