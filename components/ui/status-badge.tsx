import type { ReactNode } from "react";

type StatusValue = "Nouveau" | "Ouvert" | "En cours" | "En attente" | "Résolu" | "Fermé" | "Critique" | "Haute" | "Normale" | "Faible" | string;
type StatusKind = "status" | "priority";

const statusTone: Record<string, string> = { Nouveau: "info", Ouvert: "warning", "En cours": "info", "En attente": "warning", Résolu: "success", Fermé: "neutral", Critique: "danger", Haute: "danger", Normale: "info", Faible: "success" };

export function StatusBadge({ value, kind = "status", children, className = "" }: { value?: StatusValue; kind?: StatusKind; children?: ReactNode; className?: string }) {
  const label = value ?? children;
  const tone = statusTone[String(value ?? children)] ?? "neutral";
  return <span className={`kit-badge kit-badge-${tone} ${className}`.trim()} data-kind={kind} role="status"><span className="kit-badge-dot" aria-hidden="true" />{label}</span>;
}

export type { StatusKind, StatusValue };
export default StatusBadge;
