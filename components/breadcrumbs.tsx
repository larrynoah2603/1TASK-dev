"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  dashboard: "Tableau de bord",
  tickets: "Tickets",
  new: "Nouveau ticket",
  inbox: "Boîte agent",
  queues: "Files",
  reporting: "Reporting",
  profile: "Mon profil",
  notifications: "Notifications",
  audit: "Audit",
  admin: "Administration",
  users: "Utilisateurs",
  departments: "Départements",
  teams: "Équipes",
  catalog: "Catalogue",
  sla: "SLA",
  technical: "Technique",
};

function labelFor(segment: string, index: number, segments: string[]) {
  if (labels[segment]) return labels[segment];
  if (segments.includes("tickets") && index === segments.indexOf("tickets") + 1) return "Détail du ticket";
  return segment.replaceAll("-", " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length || pathname === "/signin" || pathname === "/pending-assignment") return null;

  const base = pathname.startsWith("/admin") ? "/admin" : "/dashboard";
  const items = [{ label: labels[base.slice(1)] ?? "Accueil", href: base }];
  let current = "";
  for (const [index, segment] of segments.entries()) {
    if (segment === "admin" && base === "/admin") continue;
    current += `/${segment}`;
    items.push({ label: labelFor(segment, index, segments), href: current });
  }

  const unique = items.filter((item, index) => index === 0 || item.href !== items[index - 1]?.href);
  return (
    <nav aria-label="Fil d’Ariane" className="breadcrumbs">
      {unique.map((item, index) => (
        <span key={item.href} className="flex items-center gap-2">
          {index ? <span aria-hidden="true" className="text-slate-300">/</span> : null}
          {index === unique.length - 1 ? <span aria-current="page" className="font-semibold text-slate-700">{item.label}</span> : <Link href={item.href as Route} className="text-slate-400 hover:operational-link-hover">{item.label}</Link>}
        </span>
      ))}
    </nav>
  );
}
