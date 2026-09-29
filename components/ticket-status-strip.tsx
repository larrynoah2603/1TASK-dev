import { Priority, TicketStatus } from "@prisma/client";
import type { TicketSlaState } from "@/lib/sla";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaIndicator } from "@/components/sla-indicator";
import { Icon } from "@/components/ui/icons";
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

/** Statut, priorité, SLA et progression du workflow. Présentation uniquement : les props et les règles sont inchangées. */
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
    <section className="kit-strip" aria-label={`État du ticket ${reference}`}>
      <div className="kit-ticket-badges">
        <StatusBadge status={status} />
        <PriorityBadge priority={priority} />
        <SlaIndicator state={slaState} dueAt={slaDueAt} startedAt={createdAt} pausedMinutes={pausedMinutes} compact />
      </div>
      <div className="kit-strip-sla">
        <SlaIndicator state={slaState} dueAt={slaDueAt} startedAt={createdAt} pausedMinutes={pausedMinutes} />
      </div>
      <ol className="kit-stepper" aria-label="Progression du workflow">
        {STATUS_ORDER.map((step, index) => {
          const complete = index < currentPosition;
          const active = index === currentPosition;
          return (
            <li key={step} className={`kit-step${complete ? " kit-step-done" : ""}${active ? " kit-step-active" : ""}`} aria-current={active ? "step" : undefined}>
              <span className="kit-step-dot" aria-hidden="true">{complete ? <Icon name="check" /> : index + 1}</span>
              <span>{STATUS_LABELS[step]}</span>
            </li>
          );
        })}
      </ol>
      <p className="kit-strip-next">Étape actuelle : <strong>{currentLabel}</strong> · {actionLabel} selon vos permissions et l’état du ticket.</p>
    </section>
  );
}
