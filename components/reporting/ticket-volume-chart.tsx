import { BarChart3 } from "lucide-react";

export function TicketVolumeChart() {
  return <section className="reporting-card reporting-chart-card" aria-labelledby="ticket-volume-title"><header className="reporting-card-header"><div><p className="eyebrow">Tendance</p><h2 id="ticket-volume-title">Évolution des tickets</h2></div></header><div className="reporting-empty-chart"><BarChart3 aria-hidden="true" /><strong>Données temporelles indisponibles</strong><span>Le service reporting actuel ne fournit pas encore de série historique.</span></div></section>;
}
