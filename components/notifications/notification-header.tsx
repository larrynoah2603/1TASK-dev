import { BellRing, CheckCheck, RefreshCw } from "lucide-react";

export function NotificationHeader({ unreadCount, busy, refreshing, onMarkAllRead, onRefresh }: { unreadCount: number; busy: boolean; refreshing: boolean; onMarkAllRead: () => void; onRefresh: () => void }) {
  return <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><BellRing className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-teal-700">Communication</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Notifications</h1><p className="mt-1 text-sm text-slate-500">Suivez les événements qui nécessitent votre attention.</p></div></div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={refreshing} onClick={onRefresh} className="button-secondary"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Actualisation…" : "Actualiser"}</button><button type="button" disabled={busy || unreadCount === 0} onClick={onMarkAllRead} className="button-primary"><CheckCheck className="size-4" /> Tout marquer lu</button></div>
  </header>;
}
