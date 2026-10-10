import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";

export function PriorityTickets({ tickets }: { tickets: DashboardTicketRow[] }) {
  const priority = tickets.filter(
    (ticket) =>
      ticket.priority === "CRITICAL" ||
      ticket.slaState === "AT_RISK" ||
      ticket.slaState === "BREACHED",
  );
  const firstPriorityTicket = priority[0];

  if (!firstPriorityTicket) return null;

  return (
    <aside className="inbox-priority-notice" aria-live="polite">
      <span className="inbox-priority-notice-icon" aria-hidden>
        <AlertTriangle />
      </span>
      <div>
        <strong>
          {priority.length} ticket{priority.length > 1 ? "s" : ""} à traiter en priorité
        </strong>
        <span>SLA à risque, dépassé ou priorité critique.</span>
      </div>
      <Link href={`/tickets/${firstPriorityTicket.id}` as Route}>
        Voir le premier
        <ArrowRight aria-hidden />
      </Link>
    </aside>
  );
}
