import type { ReactNode } from "react";

type StatusValue = "Nouveau" | "Ouvert" | "En cours" | "En attente" | "Résolu" | "Fermé" | "Critique" | "Haute" | "Normale" | "Faible" | string;
type StatusKind = "status" | "priority";

const statusTone: Record<string, string> = { Nouveau: "info", Ouvert: "warning", "En cours": "info", "En attente": "warning", Résolu: "success", Fermé: "neutral", Critique: "danger", Haute: "danger", Normale: "info", Faible: "success" };

export function StatusBadge({ value, kind = "status", children, className = "" }: { value?: StatusValue; kind?: StatusKind; children?: ReactNode; className?: string }) {
  const label = value ?? children;
  const tone = statusTone[String(value ?? children)] ?? "neutral";
  return <span className={`ui-status-badge ui-status-badge-${tone} ui-status-badge-${kind} ${className}`} role="status"><span className="ui-status-badge-dot" aria-hidden="true" />{label}</span>;
}

export type { StatusKind, StatusValue };
export default StatusBadge;
