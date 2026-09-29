"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";

// Sections dont les sous-pages appartiennent à d'autres entrées du menu : correspondance exacte uniquement.
const EXACT_ONLY = new Set(["/dashboard", "/admin"]);

function isCurrentLink(href: string, pathname: string, searchParams: URLSearchParams) {
  const target = new URL(href, "http://1task.local");
  const targetParams = Array.from(target.searchParams.entries());

  // Les pages de détail (/tickets/123) gardent leur section active dans le menu.
  if (!targetParams.length && !EXACT_ONLY.has(target.pathname) && pathname.startsWith(`${target.pathname}/`)) return true;

  if (target.pathname !== pathname) return false;

  if (!targetParams.length) {
    return !searchParams.has("scope") && !searchParams.has("sla") && !searchParams.has("queueId");
  }

  return targetParams.every(([key, value]) => searchParams.get(key) === value);
}

export function ShellNavLink({
  href,
  children,
  icon,
  title,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  title?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = isCurrentLink(href, pathname, searchParams);

  return (
    <Link href={href as Route} aria-current={active ? "page" : undefined} title={title} className={`kit-nav-item nav-link-industrial ${className}`.trim()}>
      <span className="kit-nav-icon">{icon}</span>
      <span className="kit-nav-text">{children}</span>
    </Link>
  );
}
