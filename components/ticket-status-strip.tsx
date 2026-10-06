import { Priority, TicketStatus } from "@prisma/client";
import type { TicketSlaState } from "@/lib/sla";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaIndicator } from "@/components/sla-indicator";
import { Icon } from "@/components/ui/icons";
import { getV1WorkflowPresentation, STATUS_LABELS, V1_WORKFLOW_STEPS, V1_WORKFLOW_STEP_LABELS } from "@/lib/domain";

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
  if (status === "CANCELLED") return -1;
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
  simplifiedV1 = false,
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
  simplifiedV1?: boolean;
}) {
  const presentation = simplifiedV1 ? getV1WorkflowPresentation(status) : null;
  const currentPosition = simplifiedV1 ? presentation!.position : statusPosition(status);
  const currentLabel = simplifiedV1 ? presentation!.label : STATUS_LABELS[status] ?? status.replaceAll("_", " ");
  const actionLabel = canClaim ? "Prendre en charge" : canResolve ? "Résoudre le ticket" : "Suivre le traitement";
  const steps = simplifiedV1 ? V1_WORKFLOW_STEPS : STATUS_ORDER;

  return (
    <section className="kit-strip" aria-label={`État du ticket ${reference}`}>
      <div className="kit-ticket-badges">
        {simplifiedV1
          ? <span className="kit-badge kit-badge-info"><span aria-hidden="true" className="kit-badge-dot" />{currentLabel}</span>
          : <StatusBadge status={status} />}
        <PriorityBadge priority={priority} />
        <SlaIndicator state={slaState} dueAt={slaDueAt} startedAt={createdAt} pausedMinutes={pausedMinutes} compact />
      </div>
      <div className="kit-strip-sla">
        <SlaIndicator state={slaState} dueAt={slaDueAt} startedAt={createdAt} pausedMinutes={pausedMinutes} />
      </div>
      <ol className="kit-stepper" aria-label="Progression du workflow">
        {steps.map((step, index) => {
          const complete = index < currentPosition;
          const active = index === currentPosition;
          const label = simplifiedV1
            ? V1_WORKFLOW_STEP_LABELS[step as (typeof V1_WORKFLOW_STEPS)[number]]
            : STATUS_LABELS[step as TicketStatus];
          return (
            <li key={step} className={`kit-step${complete ? " kit-step-done" : ""}${active ? " kit-step-active" : ""}`} aria-current={active ? "step" : undefined}>
              <span className="kit-step-dot" aria-hidden="true">{complete ? <Icon name="check" /> : index + 1}</span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="kit-strip-next">Étape actuelle : <strong>{currentLabel}</strong> · {actionLabel} selon vos permissions et l’état du ticket.</p>
    </section>
  );
}
