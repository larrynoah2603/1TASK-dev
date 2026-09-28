import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CalendarClock, Files, Ticket, X } from "lucide-react";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import type { ClientRow } from "@/components/clients/clients-page";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export function ClientDetailsPanel({ client, onClose }: { client: ClientRow | null; onClose: () => void }) {
  if (!client) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="client-panel-title" className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-teal-700">{client.code}</p>
            <h2 id="client-panel-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{client.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le panneau" className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="size-5" /></button>
        </div>

        <div className="mt-5"><ClientStatusBadge isActive={client.isActive} /></div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-4"><Files className="size-4 text-teal-700" /><p className="mt-3 text-2xl font-bold text-slate-950">{client._count.dossiers}</p><p className="text-xs text-slate-500">Dossiers rattachés</p></div>
          <div className="rounded-xl border border-slate-200 p-4"><Ticket className="size-4 text-teal-700" /><p className="mt-3 text-2xl font-bold text-slate-950">{client._count.tickets ?? "—"}</p><p className="text-xs text-slate-500">Tickets visibles</p></div>
        </div>

        <section className="mt-7 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dernière activité</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-800"><CalendarClock className="size-4 text-slate-400" /> Mis à jour le {dateFormatter.format(new Date(client.updatedAt))}</p>
        </section>

        <div className="mt-auto pt-8">
          <Link href={`/clients/${client.id}` as Route} className="button-primary w-full">
            Ouvrir la fiche client <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
