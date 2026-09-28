import { Plus, UsersRound } from "lucide-react";

type ClientsHeaderProps = {
  clientCount: number;
  activeCount: number;
  dossierCount: number;
  canManage: boolean;
  onCreate: () => void;
};

export function ClientsHeader({
  clientCount,
  activeCount,
  dossierCount,
  canManage,
  onCreate,
}: ClientsHeaderProps) {
  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 border-b border-slate-100 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <UsersRound aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Portefeuille</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Clients</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Retrouvez vos comptes clients et accédez rapidement à leur activité.
            </p>
          </div>
        </div>
        {canManage ? (
          <button type="button" className="button-primary w-full sm:w-auto" onClick={onCreate}>
            <Plus aria-hidden="true" className="size-4" />
            Nouveau client
          </button>
        ) : null}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/60">
        <div className="px-4 py-4 sm:px-7">
          <dt className="text-[11px] font-medium text-slate-500">Clients visibles</dt>
          <dd className="mt-1 text-xl font-bold text-slate-950">{clientCount}</dd>
        </div>
        <div className="px-4 py-4 sm:px-7">
          <dt className="text-[11px] font-medium text-slate-500">Clients actifs</dt>
          <dd className="mt-1 text-xl font-bold text-emerald-700">{activeCount}</dd>
        </div>
        <div className="px-4 py-4 sm:px-7">
          <dt className="text-[11px] font-medium text-slate-500">Dossiers</dt>
          <dd className="mt-1 text-xl font-bold text-slate-950">{dossierCount}</dd>
        </div>
      </dl>
    </header>
  );
}
