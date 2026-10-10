import { AlertTriangle, Inbox, UserRound } from "lucide-react";

type AgentKpiSummary = {
  mine: number;
  unassigned: number;
  slaAttention: number;
  waiting: number;
};

export function AgentKpiGrid({ summary }: { summary: AgentKpiSummary }) {
  return (
    <div className="inbox-summary-inline" aria-label="Résumé de l'Inbox">
      <span>
        <UserRound aria-hidden />
        <b>{summary.mine}</b>
        <em>assigné{summary.mine === 1 ? "" : "s"}</em>
      </span>
      <span>
        <Inbox aria-hidden />
        <b>{summary.unassigned}</b>
        <em>à prendre</em>
      </span>
      <span className={summary.slaAttention ? "is-warning" : ""}>
        <AlertTriangle aria-hidden />
        <b>{summary.slaAttention}</b>
        <em>SLA à risque</em>
      </span>
    </div>
  );
}
