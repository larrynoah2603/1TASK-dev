import Link from "next/link";
import type { Route } from "next";
import type { TicketListSlaFilter, TicketListScope } from "@/lib/ticket-service";

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
  const links: { label: string; href: string; active: boolean }[] = [
    {
      label: scopeLabels.all,
      href: basePath,
      active: (!scope || scope === "all") && !sla,
    },
    {
      label: scopeLabels.unassigned,
      href: basePath + "?scope=unassigned",
      active: scope === "unassigned" && !sla,
    },
    {
      label: scopeLabels.mine,
      href: basePath + "?scope=mine",
      active: scope === "mine" && !sla,
    },
    {
      label: scopeLabels.team,
      href: basePath + "?scope=team",
      active: scope === "team" && !sla,
    },
    {
      label: "SLA à surveiller",
      href: basePath + "?sla=attention",
      active: sla === "attention",
    },
    {
      label: "SLA dépassé",
      href: basePath + "?sla=breached",
      active: sla === "breached",
    },
  ];

  if (includeRequested) {
    links.splice(1, 0, {
      label: scopeLabels.requested,
      href: "/tickets",
      active: scope === "requested",
    });
  }

  return (
    <nav aria-label="Vues du ticketing" className="view-switcher">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href as Route}
          className={`view-switcher-link ${link.active ? "view-switcher-link-active" : ""}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
