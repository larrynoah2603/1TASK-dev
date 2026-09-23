import { BarChart3 } from "lucide-react";

export function PriorityChart() {
  return <section className="reporting-card reporting-chart-card" aria-labelledby="priority-title"><header className="reporting-card-header"><div><p className="eyebrow">Distribution</p><h2 id="priority-title">Tickets par priorité</h2></div></header><div className="reporting-empty-chart"><BarChart3 aria-hidden="true" /><strong>Répartition indisponible</strong><span>Le service reporting actuel ne fournit pas les agrégats par priorité.</span></div></section>;
}
