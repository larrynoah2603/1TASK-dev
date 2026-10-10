import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, Clock3, Inbox, UserRound } from "lucide-react";

type AgentKpiSummary = {
  mine: number;
  unassigned: number;
  slaAttention: number;
  waiting: number;
};

export function AgentKpiGrid({ summary }: { summary: AgentKpiSummary }) {
  const items = [
    {
      label: "Mes tickets",
      value: summary.mine,
      href: "/inbox?scope=mine",
      icon: UserRound,
      title: "Voir les tickets affectés à votre profil",
      tone: "info",
    },
    {
      label: "À prendre",
      value: summary.unassigned,
      href: "/inbox?scope=unassigned",
      icon: Inbox,
      title: "Voir les tickets non affectés de votre périmètre",
      tone: "neutral",
    },
    {
      label: "SLA à risque",
      value: summary.slaAttention,
      href: "/inbox?sla=attention",
      icon: AlertTriangle,
      title: "Voir les tickets proches ou au-delà de leur échéance SLA",
      tone: summary.slaAttention ? "warning" : "success",
    },
  ] as const;

  return (
    <nav className="agent-kpi-grid agent-kpi-strip" aria-label="Indicateurs rapides de l'Inbox">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href as Route}
            className={`agent-kpi-chip agent-kpi-chip-${item.tone}`}
            title={item.title}
          >
            <Icon aria-hidden />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Link>
        );
      })}

      <div
        className="agent-kpi-chip agent-kpi-chip-info"
        title="Tickets en attente d'une information ou d'une résolution"
      >
        <Clock3 aria-hidden />
        <span>En attente</span>
        <strong>{summary.waiting}</strong>
      </div>
    </nav>
  );
}
