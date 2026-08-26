import type { TicketSlaState } from "@/lib/sla";
import { SlaIndicator } from "@/components/sla-indicator";

export function SlaBadge({
  state,
  dueAt,
  compact = false,
  startedAt,
  pausedMinutes = 0,
}: {
  state: TicketSlaState;
  dueAt: Date | null;
  compact?: boolean;
  startedAt?: Date | null;
  pausedMinutes?: number;
}) {
  return <SlaIndicator state={state} dueAt={dueAt} startedAt={startedAt} pausedMinutes={pausedMinutes} compact={compact} />;
}
