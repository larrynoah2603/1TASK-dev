import { redirect } from "next/navigation";
import { ClientListClient } from "@/components/client-list-client";
import { listClientAccounts } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";

export default async function ClientsPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const permissions = permissionCodes(user);
  if (!permissions.includes("portfolio:read")) redirect("/dashboard");

  const clients = await listClientAccounts(user);
  return (
    <div data-ui-family="portfolio" className="portfolio-page space-y-5">
      <header className="page-header"><div><p className="eyebrow">Portefeuille de production</p><h1 className="mt-1">Clients</h1><p className="page-header-description mt-1">Gérez le référentiel client et accédez à ses dossiers, missions et tickets visibles.</p></div></header>
      <ClientListClient initialClients={clients.map((client) => ({ ...client, updatedAt: client.updatedAt.toISOString() }))} canManage={permissions.includes("portfolio:manage")} />
    </div>
  );
}
