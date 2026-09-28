import type { LucideIcon } from "lucide-react";

export function AdminStatCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: number; detail: string; icon: LucideIcon; tone?: "blue" | "green" | "amber" | "slate" }) {
  return <article className={`admin-modern-stat admin-modern-stat-${tone}`}><div className="admin-modern-stat-icon"><Icon aria-hidden="true" /></div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>;
}
