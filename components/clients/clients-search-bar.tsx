import { Search, SlidersHorizontal, X } from "lucide-react";

export type ClientStatusFilter = "all" | "active" | "inactive";

type ClientsSearchBarProps = {
  query: string;
  status: ClientStatusFilter;
  resultCount: number;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: ClientStatusFilter) => void;
};

export function ClientsSearchBar({
  query,
  status,
  resultCount,
  onQueryChange,
  onStatusChange,
}: ClientsSearchBarProps) {
  return (
    <section aria-label="Recherche et filtres" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher un client</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher par nom ou code client…"
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </label>

        <div className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="hidden size-4 text-slate-400 sm:block" />
          <label className="sr-only" htmlFor="client-status-filter">Filtrer par statut</label>
          <select
            id="client-status-filter"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as ClientStatusFilter)}
            className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 sm:min-w-40"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Clients actifs</option>
            <option value="inactive">Clients inactifs</option>
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500" aria-live="polite">
        {resultCount} résultat{resultCount === 1 ? "" : "s"}
      </p>
    </section>
  );
}
