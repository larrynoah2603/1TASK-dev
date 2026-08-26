import { Priority, TicketStatus } from "@prisma/client";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";

function toneClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`semantic-badge status-badge status-badge-${toneClass(status)}`}><span aria-hidden="true" className="status-badge-dot" />{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`semantic-badge priority-badge priority-badge-${toneClass(priority)}`}>{PRIORITY_LABELS[priority]}</span>;
}
