import { Gauge, PieChart } from "lucide-react";

type Props = { slaRate: number };
export function SlaPerformanceChart({ slaRate }: Props) {
  return <section className="reporting-card reporting-sla-card" aria-labelledby="sla-performance-title"><header className="reporting-card-header"><div><p className="eyebrow">Engagements</p><h2 id="sla-performance-title">Performance SLA</h2></div></header><div className="reporting-sla-grid"><div className="reporting-gauge"><Gauge aria-hidden="true" /><strong>{slaRate > 0 ? `${slaRate}%` : "—"}</strong><span>{slaRate > 0 ? "respect SLA" : "Taux non fourni"}</span></div><div className="reporting-empty-chart reporting-empty-chart-compact"><PieChart aria-hidden="true" /><strong>Répartition SLA</strong><span>Les catégories respecté, attention et dépassé ne sont pas exposées par le service actuel.</span></div></div></section>;
}
