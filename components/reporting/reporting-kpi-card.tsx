import type { LucideIcon } from "lucide-react";

export function ReportingKpiCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: LucideIcon; tone: "primary" | "green" | "amber" | "red" }) {
  return <article className={`reporting-modern-kpi reporting-modern-kpi-${tone}`}><div className="reporting-kpi-icon"><Icon aria-hidden="true" /></div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>;
}
