import type { LucideIcon } from "lucide-react";

export function DashboardKpiCard({ label, value, detail, trend, icon: Icon, tone }: { label: string; value: number; detail: string; trend: string; icon: LucideIcon; tone: string }) {
  return <article className={`dashboard-modern-kpi dashboard-modern-kpi-${tone}`}><div className="dashboard-modern-kpi-top"><span>{label}</span><span className="dashboard-modern-kpi-icon"><Icon size={17} aria-hidden="true" /></span></div><strong>{value}</strong><div className="dashboard-modern-kpi-bottom"><span>{detail}</span><b>{trend}</b></div></article>;
}
