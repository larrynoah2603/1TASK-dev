import { Priority, TicketStatus } from "@prisma/client";
import type { TicketSlaState } from "@/lib/sla";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaIndicator } from "@/components/sla-indicator";
import { STATUS_LABELS } from "@/lib/domain";

const STATUS_ORDER = [
  "NEW",
  "TO_QUALIFY",
  "TO_ASSIGN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLUTION_PENDING",
  "CLOSED",
] as const;

function statusPosition(status: string) {
  if (status === "BLOCKED") return STATUS_ORDER.indexOf("IN_PROGRESS");
  if (status === "REOPENED") return STATUS_ORDER.indexOf("TO_QUALIFY");
  const position = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number]);
  return position >= 0 ? position : 0;
}

export function TicketStatusStrip({
  reference,
  status,
  priority,
  slaState,
  slaDueAt,
  createdAt,
  pausedMinutes = 0,
  canClaim,
  canResolve,
}: {
  reference: string;
  status: TicketStatus;
  priority: Priority;
  slaState: TicketSlaState;
  slaDueAt: Date | null;
  createdAt?: Date | null;
  pausedMinutes?: number;
  canClaim: boolean;
  canResolve: boolean;
}) {
  const currentPosition = statusPosition(status);
  const currentLabel = STATUS_LABELS[status] ?? status.replaceAll("_", " ");
  const actionLabel = canClaim ? "Prendre en charge" : canResolve ? "Soumettre la résolution" : "Consulter le ticket";

  return (
    <section className="ticket-status-strip" aria-label="État du ticket">
      <div className="ticket-status-strip-topline">
        <div className="min-w-0">
          <p className="ticket-status-reference">{reference}</p>
          <p className="ticket-status-current">Étape actuelle : <strong>{currentLabel}</strong></p>
        </div>
        <div className="ticket-status-badges">
          <StatusBadge status={status} />
          <PriorityBadge priority={priority} />
          <SlaIndicator state={slaState} dueAt={slaDueAt} startedAt={createdAt} pausedMinutes={pausedMinutes} compact />
        </div>
      </div>
      <div className="ticket-status-sla-callout">
        <SlaIndicator state={slaState} dueAt={slaDueAt} startedAt={createdAt} pausedMinutes={pausedMinutes} />
      </div>
      <div className="ticket-status-progress" aria-label="Progression du workflow">
        {STATUS_ORDER.map((step, index) => {
          const complete = index < currentPosition;
          const active = index === currentPosition;
          return (
            <span key={step} className={`ticket-status-step${complete ? " ticket-status-step-complete" : ""}${active ? " ticket-status-step-active" : ""}`}>
              <span className="ticket-status-step-dot" aria-hidden="true">{complete ? "✓" : index + 1}</span>
              <span className="ticket-status-step-label">{STATUS_LABELS[step]}</span>
            </span>
          );
        })}
      </div>
      <p className="ticket-status-hint">{actionLabel} selon vos permissions et l’état actuel du ticket.</p>
    </section>
  );
}
