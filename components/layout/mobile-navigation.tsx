"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useNotificationState } from "@/components/notification-state";

type MobileLink = { href: string; label: string; icon: React.ReactNode; badge?: number };

const SHORT_LABELS: Record<string, string> = { "/dashboard": "Accueil", "/notifications": "Alertes", "/profile": "Profil", "/inbox": "Boîte" };

export function MobileNavigation({ links }: { links: MobileLink[] }) {
  const pathname = usePathname();
  const { unreadCount } = useNotificationState();
  const preferred = ["/dashboard", "/tickets", "/inbox", "/notifications", "/profile"];
  const shown = preferred.map((href) => links.find((link) => link.href === href)).filter((link): link is MobileLink => Boolean(link)).slice(0, 5);
  return (
    <nav className="kit-bottom-nav" aria-label="Navigation mobile">
      {shown.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href as Route} className="kit-bottom-link" aria-current={active ? "page" : undefined}>
            {link.icon}
            {link.href === "/notifications" && unreadCount > 0 ? <span className="kit-bottom-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
            {link.href === "/inbox" && (link.badge ?? 0) > 0 ? <span className="kit-bottom-badge">{(link.badge ?? 0) > 99 ? "99+" : link.badge}</span> : null}
            <span>{SHORT_LABELS[link.href] ?? link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
