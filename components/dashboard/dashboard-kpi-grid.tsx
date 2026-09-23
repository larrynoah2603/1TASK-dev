import { Activity, CircleCheck, Clock3, Ticket } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

type DashboardKpi = { open: number; inProgress: number; resolved: number; atRisk: number };

export function DashboardKpiGrid({ values }: { values: DashboardKpi }) {
  return <section className="dashboard-enterprise-kpis" aria-label="Indicateurs clés">
    <StatCard title="Tickets ouverts" value={values.open} iconComponent={Ticket} tone="info" description="dans votre périmètre" href="/tickets?status=NEW" />
    <StatCard title="Tickets en cours" value={values.inProgress} iconComponent={Activity} tone="warning" description="traitement actif" href="/tickets?status=IN_PROGRESS" />
    <StatCard title="Tickets résolus" value={values.resolved} iconComponent={CircleCheck} tone="success" description="historique récent" href="/tickets?status=CLOSED" />
    <StatCard title="SLA à risque" value={values.atRisk} iconComponent={Clock3} tone="danger" description="à surveiller" href="/tickets?sla=attention" />
  </section>;
}
export type { DashboardKpi };
