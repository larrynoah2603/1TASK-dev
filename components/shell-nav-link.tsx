"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";

function isCurrentLink(href: string, pathname: string, searchParams: URLSearchParams) {
  const target = new URL(href, "http://1task.local");
  if (target.pathname !== pathname) return false;

  const targetParams = Array.from(target.searchParams.entries());
  if (!targetParams.length) {
    return !searchParams.has("scope") && !searchParams.has("sla") && !searchParams.has("queueId");
  }

  return targetParams.every(([key, value]) => searchParams.get(key) === value);
}

export function ShellNavLink({
  href,
  children,
  icon,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = isCurrentLink(href, pathname, searchParams);

  return (
    <Link
      href={href as Route}
      aria-current={active ? "page" : undefined}
      className={`nav-link ${active ? "nav-link-active" : ""} flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium ${className}`}
    >
      <span className="nav-icon grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/[0.06] text-slate-400 transition-colors">
        {icon}
      </span>
      <span className="shell-nav-label truncate">{children}</span>
    </Link>
  );
}
