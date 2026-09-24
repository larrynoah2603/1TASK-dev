"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useNotificationState } from "@/components/notification-state";

type MobileLink = { href: string; label: string; icon: React.ReactNode };

export function MobileNavigation({ links }: { links: MobileLink[] }) {
  const pathname = usePathname();
  const { unreadCount } = useNotificationState();
  const preferred = ["/dashboard", "/tickets", "/inbox", "/notifications", "/profile"];
  const shown = preferred.map((href) => links.find((link) => link.href === href)).filter((link): link is MobileLink => Boolean(link)).slice(0, 5);
  return (
    <nav className="mobile-bottom-nav enterprise-mobile-nav mobile-reference-nav lg:hidden" aria-label="Navigation mobile">
      {shown.slice(0, 2).map((link) => <MobileItem key={link.href} link={link} active={pathname === link.href || pathname.startsWith(`${link.href}/`)} unreadCount={unreadCount} />)}
      {shown.slice(2).map((link) => <MobileItem key={link.href} link={link} active={pathname === link.href || pathname.startsWith(`${link.href}/`)} unreadCount={unreadCount} />)}
    </nav>
  );
}

function MobileItem({ link, active, unreadCount }: { link: MobileLink; active: boolean; unreadCount: number }) {
  return <Link href={link.href as Route} className={`mobile-bottom-link enterprise-mobile-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}><span className="relative">{link.icon}{link.href === "/notifications" && unreadCount > 0 ? <i>{unreadCount > 9 ? "9+" : unreadCount}</i> : null}</span><small>{link.label.replace("Tableau de bord", "Accueil").replace("Notifications", "Alertes")}</small></Link>;
}
