import { Priority, TicketStatus } from "@prisma/client";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";

const statusClasses: Record<TicketStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  TO_QUALIFY: "bg-indigo-50 text-indigo-700",
  TO_ASSIGN: "bg-amber-50 text-amber-700",
  ASSIGNED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-cyan-50 text-cyan-700",
  BLOCKED: "bg-orange-50 text-orange-700",
  RESOLUTION_PENDING: "bg-emerald-50 text-emerald-700",
  REOPENED: "bg-rose-50 text-rose-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

const priorityClasses: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-indigo-50 text-indigo-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`semantic-badge inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${statusClasses[status]}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`semantic-badge inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${priorityClasses[priority]}`}>{PRIORITY_LABELS[priority]}</span>;
}
