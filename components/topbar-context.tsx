"use client";

import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  "/dashboard": "Vue personnelle",
  "/inbox": "Boîte agent",
  "/dashboard/responsible": "Espace responsable",
  "/reporting": "Reporting",
  "/tickets": "Mes tickets",
  "/queues": "Files et équipes",
  "/profile": "Mon profil",
  "/notifications": "Notifications",
  "/admin": "Administration",
};

function sectionLabel(pathname: string) {
  if (pathname.startsWith("/tickets/")) return "Détail du ticket";
  if (pathname.startsWith("/admin/")) return "Administration";
  return labels[pathname] ?? "Espace de travail";
}

export function TopbarContext() {
  const pathname = usePathname();
  return (
    <div className="topbar-context" aria-label="Contexte de navigation">
      <button type="button" className="topbar-context-icon topbar-context-menu" onClick={() => window.dispatchEvent(new CustomEvent("1task:toggle-sidebar"))} aria-label="Ouvrir ou replier la navigation" title="Navigation">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <span className="topbar-context-icon topbar-context-home" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m4 10 8-6 8 6v9H4zM9 19v-5h6v5" /></svg></span>
      <span className="topbar-context-separator" aria-hidden="true">›</span>
      <span className="topbar-context-label">{sectionLabel(pathname)}</span>
    </div>
  );
}
