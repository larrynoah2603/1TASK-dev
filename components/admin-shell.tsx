import Link from "next/link";
import { RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasGlobalRole } from "@/lib/access-control";
import { ROLE_LABELS } from "@/lib/identity";
import { CollapsibleShell } from "@/components/collapsible-shell";
import { GlobalSearch } from "@/components/global-search";
import { HelpMenu } from "@/components/help-menu";
import { NotificationCenter } from "@/components/notification-center";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShellNavLink } from "@/components/shell-nav-link";
import { permissionCodes, roleCodes, toAccessSubject, type UserContext } from "@/lib/server-auth";

type AdminLink = { href: string; label: string; short: string; permission?: string; role: "FUNCTIONAL" | "TECHNICAL" | "ANY" };
const adminLinks: AdminLink[] = [
  { href: "/admin", label: "Vue d’ensemble", short: "01", role: "ANY" },
  { href: "/admin/users", label: "Utilisateurs et rôles", short: "02", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/departments", label: "Départements / Entra", short: "03", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/queues", label: "Files et responsables", short: "04", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/teams", label: "Équipes et agents", short: "05", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/catalog", label: "Catalogue de services", short: "06", role: "FUNCTIONAL", permission: "catalog:manage" },
  { href: "/admin/sla", label: "SLA et escalades", short: "07", role: "FUNCTIONAL", permission: "sla:manage" },
  { href: "/admin/notifications", label: "Notifications", short: "08", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/tickets", label: "Supervision des tickets", short: "09", role: "FUNCTIONAL", permission: "ticket:read" },
  { href: "/admin/audit", label: "Journal d’audit", short: "10", role: "FUNCTIONAL", permission: "audit:read" },
  { href: "/admin/reporting", label: "Reporting autorisé", short: "11", role: "FUNCTIONAL", permission: "reporting:read" },
  { href: "/admin/technical", label: "Configuration technique", short: "12", role: "TECHNICAL", permission: "technical:manage" },
];

export async function AdminShell({ user, children }: { user: UserContext; children: React.ReactNode }) {
  const unreadCount = await prisma.notification.count({ where: { recipientId: user.id, readAt: null } });
  const subject = toAccessSubject(user);
  const codes = roleCodes(user);
  const permissions = permissionCodes(user);
  const functional = hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN);
  const technical = hasGlobalRole(subject, RoleCode.TECHNICAL_ADMIN);
  const visibleLinks = adminLinks.filter((link) => {
    const roleAllowed = link.role === "ANY" || (link.role === "FUNCTIONAL" ? functional : technical);
    return roleAllowed && (!link.permission || permissions.includes(link.permission));
  });
  const roleLabel = codes.map((code) => ROLE_LABELS[code]).join(" · ");
  const sidebar = (
    <>
      <div className="sidebar-brand-block"><div className="sidebar-reference-brand"><span className="sidebar-reference-mark sidebar-mark-1t" aria-hidden="true">1T</span><span className="sidebar-brand-wordmark">1TASK</span><span className="sidebar-label ml-auto grid h-6 w-6 place-items-center rounded-md border border-[#8b8cf1]/30 bg-[#8b8cf1]/10 text-xs font-bold text-[#c8c8ff]">✓</span></div><div className="sidebar-extra mt-3 rounded-lg border border-[#8b8cf1]/20 bg-[#5b5bd6]/10 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#bdbdff]">Console 1TASK</p><p className="mt-1 text-sm font-semibold text-white">Administration</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Configuration, supervision et traçabilité.</p></div></div>
      <nav aria-label="Navigation administration" className="sidebar-nav px-3 py-3">{visibleLinks.map((link) => <ShellNavLink key={link.href} href={link.href} icon={<span className="text-[10px] font-bold tabular-nums">{link.short}</span>}>{link.label}</ShellNavLink>)}</nav>
      <div className="sidebar-extra hidden border-t border-white/[0.09] px-4 py-3 text-xs md:mt-auto md:block"><p className="font-semibold text-slate-200">Périmètre administrateur</p><p className="mt-2 flex items-center gap-2 text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-[#8b8cf1]" />{functional ? "Fonctionnel global" : "Technique uniquement"}</p></div>
    </>
  );
  const topbar = <div className="flex min-w-0 items-center gap-2"><GlobalSearch /><div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2"><NotificationCenter initialUnreadCount={unreadCount} /><HelpMenu /><ThemeToggle /><Link href="/dashboard" className="button-secondary hidden min-h-8 px-2.5 text-xs sm:inline-flex">Espace normal</Link><ProfileMenu name={user.name} email={user.email} department="Console d’administration" roles={roleLabel} admin /></div></div>;
  return <CollapsibleShell variant="admin" sidebar={sidebar} topbar={topbar}>{children}</CollapsibleShell>;
}
