import type { ReactNode } from "react";

type ChartCardProps = { title: string; description?: string; period?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string };

export function ChartCard({ title, description, period, actions, children, className = "" }: ChartCardProps) {
  return <section className={`ui-chart-card ${className}`}><header className="ui-chart-card-header"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div><div className="ui-chart-card-actions">{period}{actions}</div></header><div className="ui-chart-card-content">{children}</div></section>;
}
export type { ChartCardProps };
export default ChartCard;
