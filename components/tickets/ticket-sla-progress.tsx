import { SlaIndicator } from "@/components/sla-indicator";
import type { TicketRow } from "@/components/ticket-table";

export function TicketSlaProgress({ ticket }: { ticket: TicketRow }) {
  return <SlaIndicator state={ticket.slaState} dueAt={ticket.slaDueAt} startedAt={ticket.createdAt} pausedMinutes={ticket.totalPausedMinutes} compact />;
}
