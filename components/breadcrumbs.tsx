"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { getRouteMeta } from "@/components/layout/route-meta";

/** Fil d'Ariane compact (parents de la page courante). Affiché dans la barre du haut. */
export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/signin" || pathname === "/pending-assignment") return null;
  const { crumbs } = getRouteMeta(pathname);
  if (!crumbs.length) return null;
  return (
    <nav aria-label="Fil d’Ariane">
      <ol className="kit-crumbs">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`}>
            {index ? <Icon name="chevronRight" /> : null}
            {crumb.href ? <Link href={crumb.href as Route}>{crumb.label}</Link> : <span>{crumb.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
