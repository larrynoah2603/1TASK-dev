import type { CSSProperties } from "react";
import type { ReportingSummary } from "@/lib/reporting-service";

export function SlaOverviewCard({ summary }: { summary: ReportingSummary }) {
  const rate = summary.slaComplianceRate;
  const respected = Math.max(0, summary.completionDenominator - summary.overdue);
  return <section className="reporting-modern-card reporting-sla-card"><div className="reporting-modern-card-heading"><div><p className="reporting-kicker">Engagements</p><h2>SLA compliance</h2></div><span className="reporting-pill">Actualisé</span></div><div className="reporting-sla-ring" style={{ "--sla-rate": `${rate}%` } as CSSProperties}><strong>{rate}%</strong><span>respecté</span></div><div className="reporting-sla-meta"><span><i className="is-good" />Respecté <b>{respected}</b></span><span><i className="is-risk" />À risque <b>{summary.overdue}</b></span></div></section>;
}
