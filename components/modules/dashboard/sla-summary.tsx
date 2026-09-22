import { PriorityBreakdown, TicketActivityChart, type DashboardTicketRow } from "@/components/dashboard-visuals";

export function SlaSummary({ tickets }: { tickets: DashboardTicketRow[] }) {
  return <div className="dashboard-requester-grid"><TicketActivityChart tickets={tickets} /><PriorityBreakdown tickets={tickets} /></div>;
}
