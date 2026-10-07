import Link from "next/link";
import type { Route } from "next";
import type { TicketListSlaFilter, TicketListScope } from "@/lib/ticket-service";
import { buildTicketViewHref } from "@/lib/ticket-filter-navigation";

const scopeLabels: Record<TicketListScope, string> = {
  all: "Tous",
  unassigned: "Non affectés",
  mine: "Mes tickets",
  team: "Mon équipe",
  requested: "Mes demandes",
};

type PreservedQuery = Record<string, string | string[] | undefined>;

function currentSearch(query: PreservedQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params.toString();
}

export function TicketViewSwitcher({
  basePath = "/inbox",
  scope,
  sla,
  includeRequested = false,
  query = {},
}: {
  basePath?: string;
  scope?: TicketListScope;
  sla?: TicketListSlaFilter;
  includeRequested?: boolean;
  query?: PreservedQuery;
}) {
  const search = currentSearch(query);
  const effectiveScope = scope ?? "all";
  const links: { label: string; href: string; active: boolean; alert?: boolean }[] = [
    {
      label: scopeLabels.all,
      href: buildTicketViewHref(basePath, search, { scope: null, sla: null }),
      active: effectiveScope === "all" && !sla,
    },
    {
      label: scopeLabels.unassigned,
      href: buildTicketViewHref(basePath, search, { scope: "unassigned", sla: null }),
      active: scope === "unassigned" && !sla,
    },
    {
      label: scopeLabels.mine,
      href: buildTicketViewHref(basePath, search, { scope: "mine", sla: null }),
      active: scope === "mine" && !sla,
    },
    {
      label: scopeLabels.team,
      href: buildTicketViewHref(basePath, search, { scope: "team", sla: null }),
      active: scope === "team" && !sla,
    },
    {
      label: "À surveiller",
      href: buildTicketViewHref(basePath, search, { sla: "attention" }),
      active: sla === "attention",
      alert: true,
    },
    {
      label: "SLA dépassé",
      href: buildTicketViewHref(basePath, search, { sla: "breached" }),
      active: sla === "breached",
      alert: true,
    },
  ];

  if (includeRequested) {
    const requestedSearch = new URLSearchParams(search);
    requestedSearch.delete("scope");
    requestedSearch.delete("sla");
    requestedSearch.delete("page");
    requestedSearch.delete("cursor");
    const suffix = requestedSearch.toString();
    links.splice(1, 0, {
      label: scopeLabels.requested,
      href: suffix ? `/tickets?${suffix}` : "/tickets",
      active: scope === "requested",
    });
  }

  return (
    <nav aria-label="Vues du ticketing" className="view-switcher">
      <div className="flex min-w-max items-center gap-1">
        {links.map((link, index) => (
          <span key={link.label} className="contents">
            {link.alert && index > 0 && !links[index - 1]?.alert ? <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" /> : null}
            <Link
              href={link.href as Route}
              className={`view-switcher-link ${link.active ? "view-switcher-link-active" : ""}`}
            >
              {link.label}
            </Link>
          </span>
        ))}
      </div>
    </nav>
  );
}
