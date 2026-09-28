import type { ReactNode } from "react";
import { Activity, CheckCircle2, Clock3, Ticket } from "lucide-react";
import { DashboardChartCard } from "./dashboard-chart-card";
import { DashboardHeader } from "./dashboard-header";
import { DashboardKpiCard } from "./dashboard-kpi-card";
import { DashboardSlaCard } from "./dashboard-sla-card";
import { DashboardTicketTable } from "./dashboard-ticket-table";
import type { DashboardKpis } from "./kpi-grid";
import type { DashboardTicket } from "./recent-tickets";

export function DashboardPage({ firstName, kpis, tickets, children }: { firstName: string; kpis: DashboardKpis; tickets: DashboardTicket[]; children?: ReactNode }) {
  return <div className="dashboard-page dashboard-modern-page">
    <DashboardHeader firstName={firstName} />
    <section className="dashboard-modern-kpis" aria-label="Indicateurs clés">
      <DashboardKpiCard label="Tickets ouverts" value={kpis.open} detail="dans votre périmètre" trend="+12%" icon={Ticket} tone="info" />
      <DashboardKpiCard label="En cours" value={kpis.inProgress} detail="traitement actif" trend="+8%" icon={Activity} tone="warning" />
      <DashboardKpiCard label="Tickets résolus" value={kpis.resolved} detail="historique récent" trend="+18%" icon={CheckCircle2} tone="success" />
      <DashboardKpiCard label="SLA à risque" value={kpis.atRisk} detail="à traiter rapidement" trend="Prioritaire" icon={Clock3} tone="danger" />
    </section>
    <div className="dashboard-modern-grid"><DashboardChartCard tickets={tickets} /><DashboardSlaCard tickets={tickets} /></div>
    <DashboardTicketTable tickets={tickets} />
    {children}
  </div>;
}
export type { DashboardKpis, DashboardTicket };

export default DashboardPage;

export function DashboardPageSlot({ children }: { children: ReactNode }) { return <>{children}</>; }
