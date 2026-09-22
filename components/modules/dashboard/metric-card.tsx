import Link from "next/link";
import type { Route } from "next";

export type Metric = { label: string; value: number; note: string; href: string; tone: string };

export function MetricCard({ metric }: { metric: Metric }) {
  return <Link href={metric.href as Route} className="dashboard-kpi-card dashboard-kpi-link"><span className="dashboard-kpi-label">{metric.label}</span><p className={`dashboard-kpi-value ${metric.tone}`}>{metric.value}</p><p className="dashboard-kpi-note">{metric.note}</p></Link>;
}

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs de vos tickets">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</section>;
}
