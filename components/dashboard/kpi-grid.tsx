import { Activity, CheckCircle2, Clock3, Ticket } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export type DashboardKpis = { open: number; inProgress: number; resolved: number; atRisk: number };
const items = [{ key: "open", label: "Tickets ouverts", detail: "dans votre périmètre", icon: Ticket, tone: "info" }, { key: "inProgress", label: "En cours", detail: "traitement actif", icon: Activity, tone: "warning" }, { key: "resolved", label: "Résolus", detail: "historique récent", icon: CheckCircle2, tone: "success" }, { key: "atRisk", label: "SLA à risque", detail: "à traiter rapidement", icon: Clock3, tone: "danger" }] as const;
export function KpiGrid({ values }: { values: DashboardKpis }) {
  return <section className="dashboard-kpi-grid" aria-label="Indicateurs clés">{items.map(({ key, label, detail, icon: Icon, tone }) => <Card key={key} className={`dashboard-kpi-card dashboard-kpi-${tone}`}><div className="dashboard-kpi-heading"><span>{label}</span><Icon aria-hidden="true" /></div><strong>{values[key]}</strong><small>{detail}</small></Card>)}</section>;
}
