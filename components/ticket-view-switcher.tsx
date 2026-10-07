"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import type { TicketListSlaFilter, TicketListScope } from "@/lib/ticket-service";
import { buildTicketQuickViewHref } from "@/lib/ticket-filter-navigation";

const scopeLabels: Record<TicketListScope, string> = {
  all: "Tous",
  unassigned: "Non affectés",
  mine: "Mes tickets",
  team: "Mon équipe",
  requested: "Demandés par moi",
};

export function TicketViewSwitcher({
  basePath = "/inbox",
  scope,
  sla,
  includeRequested = false,
}: {
  basePath?: string;
  scope?: TicketListScope;
  sla?: TicketListSlaFilter;
  includeRequested?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const path = pathname || basePath;
  const scopeValue = scope ?? "all";

  const scopes: TicketListScope[] = includeRequested
    ? ["all", "requested", "unassigned", "mine", "team"]
    : ["all", "unassigned", "mine", "team"];

  const scopeHref = (nextScope: TicketListScope) =>
    buildTicketQuickViewHref(path, currentSearch, { scope: nextScope });

  const slaHref = (nextSla?: TicketListSlaFilter) =>
    buildTicketQuickViewHref(path, currentSearch, { sla: nextSla });

  return (
    <nav aria-label="Vues du ticketing" className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-1 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Périmètre de travail">
        {scopes.map((item) => (
          <Link
            key={item}
            href={scopeHref(item) as Route}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${scopeValue === item ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
          >
            {scopeLabels[item]}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1" aria-label="Alertes SLA">
        <Link
          href={slaHref(sla === "attention" ? undefined : "attention") as Route}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${sla === "attention" ? "bg-amber-100 text-amber-900" : "text-slate-600 hover:bg-amber-50 hover:text-amber-900"}`}
        >
          SLA à surveiller
        </Link>
        <Link
          href={slaHref(sla === "breached" ? undefined : "breached") as Route}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${sla === "breached" ? "bg-rose-100 text-rose-900" : "text-slate-600 hover:bg-rose-50 hover:text-rose-900"}`}
        >
          SLA dépassé
        </Link>
      </div>
    </nav>
  );
}
