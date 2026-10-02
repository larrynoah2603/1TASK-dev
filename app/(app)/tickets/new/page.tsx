import { TicketWizard } from "@/components/tickets/ticket-wizard";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/server-auth";
import { TicketWorkspace } from "@/components/tickets/ticket-workspace";
import { getProductCapabilities } from "@/lib/product-policy.server";

export default async function NewTicketPage() {
  try {
    await requirePermission("ticket:create");
  } catch {
    redirect("/dashboard");
  }
  const capabilities = getProductCapabilities();
  return <TicketWorkspace><TicketWizard simplified={!capabilities.confidentialTicketCreation && !capabilities.productionPortfolio} /></TicketWorkspace>;
}
