import type { ReactNode } from "react";
import { KpiGrid, type DashboardKpis } from "./kpi-grid";
import { RecentTickets, type DashboardTicket } from "./recent-tickets";
import { ActivityTimeline } from "./activity-timeline";
import { SlaOverview } from "./sla-overview";

export function DashboardPage({ firstName, kpis, tickets, children }: { firstName: string; kpis: DashboardKpis; tickets: DashboardTicket[]; children?: ReactNode }) {
  return <div className="dashboard-page dashboard-reference-page">
    <header className="dashboard-reference-header"><div><p className="eyebrow">Votre espace de support</p><h1>Bonjour {firstName}</h1><p className="page-header-description">Voici un aperçu de vos demandes et de leur suivi.</p></div></header>
    <KpiGrid values={kpis} />
    <div className="dashboard-reference-main-grid"><RecentTickets tickets={tickets} /><ActivityTimeline tickets={tickets} /></div>
    <SlaOverview tickets={tickets} />
    {children}
  </div>;
}
export type { DashboardKpis, DashboardTicket };

export default DashboardPage;

export function DashboardPageSlot({ children }: { children: ReactNode }) { return <>{children}</>; }
