import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";

const activityFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function InboxTicketCard({ ticket, selected, onSelect }: { ticket: DashboardTicketRow; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} aria-pressed={selected} className={`w-full border-b border-slate-100 p-4 text-left transition last:border-0 hover:bg-slate-50 ${selected ? "bg-teal-50/70 shadow-[inset_3px_0_0_#0f766e]" : "bg-white"}`}>
    <div className="flex items-start justify-between gap-3"><span className="font-mono text-[11px] font-bold text-teal-700">{ticket.reference}</span><SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact /></div>
    <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{ticket.title}</h3>
    <p className="mt-1 truncate text-xs text-slate-500">{ticket.requester.name} · {ticket.queue.name}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2"><PriorityBadge priority={ticket.priority} /><StatusBadge status={ticket.status} /><time className="ml-auto text-[10px] text-slate-400">{activityFormatter.format(ticket.updatedAt)}</time></div>
  </button>;
}
