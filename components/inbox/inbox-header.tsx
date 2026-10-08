import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

export function InboxHeader({ ticketCount }: { ticketCount: number }) {
  return (
    <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Sparkles className="size-5" /></span>
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-teal-700">Poste agent</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Inbox</h1><p className="mt-1 text-sm text-slate-500">Priorisez, analysez et traitez vos demandes depuis un espace unifié.</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:mr-2">{ticketCount} ticket{ticketCount === 1 ? "" : "s"}</span>
        <Link href="/tickets" className="button-secondary"><Search className="size-4" /> Rechercher</Link>
      </div>
    </header>
  );
}
