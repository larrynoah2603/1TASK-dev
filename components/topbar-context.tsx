"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icon } from "@/components/ui/icons";
import { getRouteMeta } from "@/components/layout/route-meta";

/** Gauche de la barre du haut : bouton menu (mobile), fil d'Ariane et titre de la page. */
export function TopbarContext() {
  const pathname = usePathname();
  const { title } = getRouteMeta(pathname);
  return (
    <>
      <button type="button" className="kit-icon-btn kit-topbar-menu" onClick={() => window.dispatchEvent(new CustomEvent("1task:open-menu"))} aria-label="Ouvrir le menu">
        <Icon name="menu" />
      </button>
      <div className="kit-pagehead">
        <Breadcrumbs />
        <h1 className="kit-page-title">{title}</h1>
      </div>
    </>
  );
}
