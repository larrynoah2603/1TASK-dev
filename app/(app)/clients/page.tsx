import { redirect } from "next/navigation";
import { ClientsPage as ClientsWorkspace } from "@/components/clients/clients-page";
import { listClientAccounts } from "@/lib/production-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";

export default async function ClientsPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const permissions = permissionCodes(user);
  if (!permissions.includes("portfolio:read")) redirect("/dashboard");

  const clients = await listClientAccounts(user);
  return (
    <div className="portfolio-page portfolio-industrial portfolio-clients-page">
      <ClientsWorkspace initialClients={clients.map((client) => ({ ...client, updatedAt: client.updatedAt.toISOString() }))} canManage={permissions.includes("portfolio:manage")} />
    </div>
  );
}
