import type { ReactNode } from "react";

export function ReportingHeader({ actions }: { actions?: ReactNode }) {
  return <header className="reporting-modern-header"><div><p className="reporting-kicker">Performance analytics</p><h1>Reporting &amp; Performance</h1><p>Une vue claire des tickets, du SLA et de la performance opérationnelle.</p></div><div className="reporting-modern-actions">{actions}</div></header>;
}
