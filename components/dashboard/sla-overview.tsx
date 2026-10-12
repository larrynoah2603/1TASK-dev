import { Card, Progress } from "@/components/ui/primitives";
import type { DashboardTicket } from "./recent-tickets";

export function SlaOverview({ tickets }: { tickets: DashboardTicket[] }) {
  const total = tickets.length;
  const healthy = tickets.filter((ticket) => ticket.slaState === "OK").length;
  const rate = total ? Math.round((healthy / total) * 100) : 0;

  return (
    <Card className="dashboard-reference-card dashboard-sla-card">
      <div className="dashboard-card-header">
        <div>
          <p className="eyebrow">Suivi des demandes</p>
          <h2>État SLA des tickets affichés</h2>
        </div>
        <span className="dashboard-widget-filter">Extrait personnel</span>
      </div>
      <div className="dashboard-sla-content">
        <div className="dashboard-sla-score">
          <strong>{total ? `${rate}%` : "—"}</strong>
          <span>Sans alerte SLA</span>
        </div>
        {total ? (
          <Progress value={rate} tone={rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger"} label="Part des tickets sans alerte SLA dans l'extrait" />
        ) : null}
        <p className="dashboard-sla-caption">
          {total
            ? `${healthy} tickets sans alerte sur ${total} demandes récentes chargées (100 maximum). Ceci n'est pas le taux SLA global.`
            : "Aucune demande récente pour calculer cet indicateur."}
        </p>
      </div>
    </Card>
  );
}
