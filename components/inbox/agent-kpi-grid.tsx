import { AlertTriangle, Clock3, Inbox, UserRound } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export function AgentKpiGrid({ summary }: { summary: { mine: number; unassigned: number; slaAttention: number; waiting: number } }) {
  return <div className="agent-kpi-grid">
    <StatCard title="Mes tickets" value={summary.mine} iconComponent={UserRound} tone="info" description="affectés à votre profil" />
    <StatCard title="À prendre en charge" value={summary.unassigned} iconComponent={Inbox} tone="neutral" description="dans votre périmètre" />
    <StatCard title="SLA à risque" value={summary.slaAttention} iconComponent={AlertTriangle} tone={summary.slaAttention ? "warning" : "success"} description="proches ou dépassés" />
    <StatCard title="En attente client" value={summary.waiting} iconComponent={Clock3} tone="info" description="information attendue" />
  </div>;
}
