"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = { dashboard: "Tableau de bord", tickets: "Tickets", new: "Nouveau ticket", inbox: "Boîte agent", clients: "Clients", dossiers: "Dossiers", missions: "Missions", assets: "Actifs", knowledge: "Connaissances", reporting: "Reporting", profile: "Profil", notifications: "Notifications", admin: "Administration", users: "Utilisateurs", departments: "Départements", teams: "Équipes", catalog: "Catalogue", sla: "SLA", audit: "Audit", technical: "Technique" };

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length || pathname === "/signin" || pathname === "/pending-assignment") return null;
  const root = pathname.startsWith("/admin") ? "/admin" : "/dashboard";
  const items = [{ href: root, label: labels[root.slice(1)] ?? "Accueil" }];
  let href = "";
  segments.forEach((segment, index) => { if (segment === "admin" && root === "/admin") return; href += `/${segment}`; const ticketDetail = segments.includes("tickets") && index === segments.indexOf("tickets") + 1; items.push({ href, label: ticketDetail ? "Détail du ticket" : labels[segment] ?? segment.replaceAll("-", " ") }); });
  const unique = items.filter((item, index) => index === 0 || item.href !== items[index - 1]?.href);
  return <nav aria-label="Fil d’Ariane" className="enterprise-breadcrumb"><Home aria-hidden="true" className="size-3.5" />{unique.map((item, index) => <span key={item.href} className="inline-flex min-w-0 items-center gap-1.5">{index ? <ChevronRight aria-hidden="true" className="size-3 text-slate-300" /> : null}{index === unique.length - 1 ? <span aria-current="page" className="truncate font-semibold text-slate-700">{item.label}</span> : <Link href={item.href as Route} className="truncate text-slate-400 transition hover:text-teal-700">{item.label}</Link>}</span>)}</nav>;
}
