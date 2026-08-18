import type { TicketSlaState } from "@/lib/sla";

const labels: Record<TicketSlaState, string> = {
  NONE: "SLA non configuré",
  OK: "SLA conforme",
  AT_RISK: "SLA proche de l’échéance",
  BREACHED: "SLA dépassé",
  PAUSED: "SLA en pause",
};

const classes: Record<TicketSlaState, string> = {
  NONE: "bg-slate-100 text-slate-500",
  OK: "bg-emerald-50 text-emerald-700",
  AT_RISK: "bg-amber-50 text-amber-800",
  BREACHED: "bg-rose-50 text-rose-700",
  PAUSED: "bg-slate-100 text-slate-600",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function SlaBadge({
  state,
  dueAt,
  compact = false,
}: {
  state: TicketSlaState;
  dueAt: Date | null;
  compact?: boolean;
}) {
  return (
    <span className={"inline-flex flex-col rounded-md px-2 py-1 text-[11px] font-semibold " + classes[state]}>
      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{compact && state === "AT_RISK" ? "À surveiller" : labels[state]}</span>
      {!compact && dueAt && state !== "NONE" ? (
        <span className="mt-0.5 pl-3 font-normal opacity-75">Échéance : {formatDate(dueAt)}</span>
      ) : null}
    </span>
  );
}
