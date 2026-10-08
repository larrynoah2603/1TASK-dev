import type { TicketSlaState } from "@/lib/sla";
import { slaProgressPercent } from "@/lib/sla";

const labels: Record<TicketSlaState, string> = {
  NONE: "SLA non configuré",
  OK: "Dans les temps",
  AT_RISK: "À surveiller",
  BREACHED: "Dépassement",
  PAUSED: "En pause",
  CONFIRMATION_PENDING: "Confirmation en attente",
  CONFIRMATION_DUE: "Confirmation arrivée à échéance",
};

const toneByState: Record<TicketSlaState, string> = {
  NONE: "sla-indicator-none",
  OK: "sla-indicator-ok",
  AT_RISK: "sla-indicator-risk",
  BREACHED: "sla-indicator-breached",
  PAUSED: "sla-indicator-paused",
  CONFIRMATION_PENDING: "sla-indicator-risk",
  CONFIRMATION_DUE: "sla-indicator-breached",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function formatRemaining(dueAt: Date | null, now: Date) {
  if (!dueAt) return "Aucune échéance";
  const delta = dueAt.getTime() - now.getTime();
  const absoluteMinutes = Math.floor(Math.abs(delta) / 60_000);
  const days = Math.floor(absoluteMinutes / (60 * 24));
  const hours = Math.floor((absoluteMinutes % (60 * 24)) / 60);
  const minutes = absoluteMinutes % 60;
  const value = days ? `${days} j ${hours} h` : hours ? `${hours} h ${minutes.toString().padStart(2, "0")}` : `${minutes} min`;
  return delta < 0 ? `Dépassé de ${value}` : `Dans ${value}`;
}

export function SlaIndicator({
  state,
  dueAt,
  startedAt,
  pausedMinutes = 0,
  compact = false,
  now = new Date(),
}: {
  state: TicketSlaState;
  dueAt: Date | null;
  startedAt?: Date | null;
  pausedMinutes?: number;
  compact?: boolean;
  now?: Date;
}) {
  const progress = startedAt && dueAt ? slaProgressPercent(now, startedAt, dueAt, pausedMinutes) : null;
  const remaining = formatRemaining(dueAt, now);
  const ariaLabel = `${labels[state]}${dueAt ? ` · ${remaining}` : ""}`;

  return (
    <span className={`sla-indicator ${toneByState[state]}${compact ? " sla-indicator-compact" : ""}`} role="status" aria-label={ariaLabel}>
      <span className="sla-indicator-head">
        <span className="sla-indicator-mark" aria-hidden="true"><span /></span>
        <span className="sla-indicator-label">{labels[state]}</span>
        {dueAt ? <strong className="sla-indicator-countdown">{remaining}</strong> : null}
      </span>
      {progress !== null ? (
        <span className="sla-indicator-track" aria-hidden="true"><span className="sla-indicator-bar" style={{ width: `${Math.max(3, Math.round(progress))}%` }} /></span>
      ) : null}
      {!compact && dueAt ? <span className="sla-indicator-due">Échéance · {formatDate(dueAt)}</span> : null}
    </span>
  );
}
