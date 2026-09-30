import { Filter } from "lucide-react";

export type NotificationFilterValue = "all" | "unread" | "read" | "critical" | "sla" | "tickets" | "assets" | "administration";

export function NotificationFilter({ value, counts, onChange }: { value: NotificationFilterValue; counts: Record<NotificationFilterValue, number>; onChange: (value: NotificationFilterValue) => void }) {
  const options: { value: NotificationFilterValue; label: string }[] = [{ value: "all", label: "Toutes" }, { value: "unread", label: "Non lues" }, { value: "read", label: "Lues" }, { value: "critical", label: "Critiques" }, { value: "sla", label: "SLA" }, { value: "tickets", label: "Tickets" }, { value: "assets", label: "Actifs" }, { value: "administration", label: "Administration" }];
  return <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Filtrer les notifications"><Filter className="ml-2 size-4 shrink-0 text-slate-400" />{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${value === option.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{option.label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${value === option.value ? "bg-white/15" : "bg-slate-100"}`}>{counts[option.value]}</span></button>)}</div>;
}
