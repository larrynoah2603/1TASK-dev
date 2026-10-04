import { Priority, TicketStatus } from "@prisma/client";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** Présentation uniquement : le ton n'a aucune incidence métier. */
const STATUS_TONE: Record<string, Tone> = {
  NEW: "info",
  TO_QUALIFY: "warning",
  TO_ASSIGN: "warning",
  ASSIGNED: "info",
  IN_PROGRESS: "info",
  BLOCKED: "danger",
  RESOLUTION_PENDING: "success",
  REOPENED: "warning",
  CLOSED: "neutral",
  CANCELLED: "neutral",
};

const PRIORITY_TONE: Record<string, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`kit-badge kit-badge-${STATUS_TONE[status] ?? "neutral"}`}><span aria-hidden="true" className="kit-badge-dot" />{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`kit-badge kit-badge-${PRIORITY_TONE[priority] ?? "neutral"}`}>{PRIORITY_LABELS[priority]}</span>;
}
