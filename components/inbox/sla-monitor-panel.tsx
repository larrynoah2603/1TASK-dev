import Link from "next/link";
import type { Route } from "next";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";

export function SlaMonitorPanel({ tickets }: { tickets: DashboardTicketRow[] }) {
  const alerts = tickets.filter((ticket) => ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED");

  return (
    <aside className="agent-card agent-sla-panel" aria-labelledby="agent-sla-title">
      <div className="agent-card-header">
        <div>
          <p className="eyebrow">Surveillance ciblée</p>
          <h2 id="agent-sla-title">Alertes SLA</h2>
        </div>
      </div>
      {alerts.length ? (
        <ul className="agent-sla-alert-list">
          {alerts.map((ticket) => (
            <li key={ticket.id}>
              <Link href={`/tickets/${ticket.id}` as Route} className="agent-sla-alert-link">
                <span className="agent-sla-alert-topline">
                  <span className="agent-sla-alert-ref">{ticket.reference}</span>
                  <span className={`agent-sla-alert-badge${ticket.slaState === "BREACHED" ? " is-breached" : ""}`}>
                    {ticket.slaState === "BREACHED" ? "Dépassé" : "À risque"}
                  </span>
                </span>
                <span className="agent-sla-alert-title">{ticket.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="agent-sla-alert-empty">Aucune alerte SLA dans cette sélection.</p>
      )}
      <p className="agent-sla-alert-footnote">
        Échantillon limité à six tickets visibles, triés par mise à jour. Il ne représente pas un taux SLA global.
      </p>
    </aside>
  );
}
