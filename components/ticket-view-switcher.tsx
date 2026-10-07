"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "next";
import type { TicketListSlaFilter, TicketListScope } from "@/lib/ticket-service";
import { buildTicketFilterPatchHref } from "@/lib/ticket-filter-navigation";

const scopeLabels: Record<TicketListScope, string> = {
  all: "Tous les tickets visibles",
  unassigned: "Tickets non affectés",
  mine: "Mes tickets affectés",
  team: "Tickets de mon équipe",
  requested: "Mes tickets",
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
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  const scopeLinks: Array<{
    label: string;
    title: string;
    path: string;
    patch: Record<string, string>;
    active: boolean;
  }> = [
    {
      label: "Tous",
      title: scopeLabels.all,
      path: basePath,
      patch: { scope: "", sla: "" },
      active: !scope || scope === "all",
    },
    {
      label: "Non affectés",
      title: scopeLabels.unassigned,
      path: basePath,
      patch: { scope: "unassigned", sla: "" },
      active: scope === "unassigned",
    },
    {
      label: "Mes tickets",
      title: scopeLabels.mine,
      path: basePath,
      patch: { scope: "mine", sla: "" },
      active: scope === "mine",
    },
    {
      label: "Mon équipe",
      title: scopeLabels.team,
      path: basePath,
      patch: { scope: "team", sla: "" },
      active: scope === "team",
    },
  ];

  if (includeRequested) {
    scopeLinks.splice(1, 0, {
      label: "Mes demandes",
      title: scopeLabels.requested,
      path: "/tickets",
      patch: { scope: "requested", sla: "" },
      active: scope === "requested",
    });
  }

  const slaLinks = [
    {
      label: "À surveiller",
      title: "SLA à surveiller",
      patch: { sla: "attention" },
      active: sla === "attention",
    },
    {
      label: "Dépassé",
      title: "SLA dépassé",
      patch: { sla: "breached" },
      active: sla === "breached",
    },
  ];

  return (
    <nav aria-label="Vues du ticketing" className="view-switcher">
      {scopeLinks.map((link) => (
        <Link
          key={link.title}
          href={buildTicketFilterPatchHref(link.path, currentSearch, link.patch) as Route}
          title={link.title}
          className={"view-switcher-link " + (link.active ? "view-switcher-link-active" : "")}
        >
          {link.label}
        </Link>
      ))}
      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />
      {slaLinks.map((link) => (
        <Link
          key={link.title}
          href={buildTicketFilterPatchHref(basePath, currentSearch, link.patch) as Route}
          title={link.title}
          className={"view-switcher-link " + (link.active ? "view-switcher-link-active" : "")}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
