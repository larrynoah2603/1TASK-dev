import { ArrowUpRight, Clock3, Files, Ticket } from "lucide-react";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import type { ClientRow } from "@/components/clients/clients-page";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function ClientCard({ client, onSelect }: { client: ClientRow; onSelect: (client: ClientRow) => void }) {
  const ticketCount = client._count.tickets;

  return (
    <article className="group flex min-h-64 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-50 to-cyan-100 text-sm font-bold text-teal-800 ring-1 ring-teal-100">
            {initials(client.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950">{client.name}</p>
            <p className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-slate-400">{client.code}</p>
          </div>
        </div>
        <ClientStatusBadge isActive={client.isActive} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Files className="size-3.5" /> Dossiers</dt>
          <dd className="mt-1.5 text-lg font-bold text-slate-900">{client._count.dossiers}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Ticket className="size-3.5" /> Tickets</dt>
          <dd className="mt-1.5 text-lg font-bold text-slate-900">{ticketCount ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-slate-500">
          <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
          Activité le {dateFormatter.format(new Date(client.updatedAt))}
        </p>
        <button type="button" onClick={() => onSelect(client)} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900">
          Détails <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
