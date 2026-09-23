import { TicketWizard } from "@/components/tickets/ticket-wizard";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/server-auth";
import { TicketWorkspace } from "@/components/tickets/ticket-workspace";

export default async function NewTicketPage() {
  try {
    await requirePermission("ticket:create");
  } catch {
    redirect("/dashboard");
  }
  return <TicketWorkspace><TicketWizard /></TicketWorkspace>;
}
