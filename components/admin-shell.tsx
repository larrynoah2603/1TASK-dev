import Link from "next/link";
import { RoleCode } from "@prisma/client";
import { hasGlobalRole } from "@/lib/access-control";
import { ROLE_LABELS } from "@/lib/identity";
import { CollapsibleShell } from "@/components/collapsible-shell";
import { GlobalSearch } from "@/components/global-search";
import { HelpMenu } from "@/components/help-menu";
import { NotificationCenter } from "@/components/notification-center";
import { NotificationStateProvider } from "@/components/notification-state";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShellNavLink } from "@/components/shell-nav-link";
import { NewTicketLauncher } from "@/components/new-ticket-launcher";
import { permissionCodes, roleCodes, toAccessSubject, type UserContext } from "@/lib/server-auth";

type AdminIconKind =
  | "overview"
  | "users"
  | "department"
  | "queue"
  | "team"
  | "catalog"
  | "sla"
  | "notifications"
  | "tickets"
  | "audit"
  | "reporting"
  | "technical";

type AdminLink = {
  href: string;
  label: string;
  icon: AdminIconKind;
  permission?: string;
  role: "FUNCTIONAL" | "TECHNICAL" | "ANY";
};

const adminLinks: AdminLink[] = [
  { href: "/admin", label: "Vue d’ensemble", icon: "overview", role: "ANY" },
  { href: "/admin/users", label: "Utilisateurs et rôles", icon: "users", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/departments", label: "Départements / Entra", icon: "department", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/queues", label: "Files et responsables", icon: "queue", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/teams", label: "Équipes et agents", icon: "team", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/catalog", label: "Catalogue de services", icon: "catalog", role: "FUNCTIONAL", permission: "catalog:manage" },
  { href: "/admin/sla", label: "SLA et escalades", icon: "sla", role: "FUNCTIONAL", permission: "sla:manage" },
  { href: "/admin/notifications", label: "Notifications", icon: "notifications", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/tickets", label: "Supervision des tickets", icon: "tickets", role: "FUNCTIONAL", permission: "ticket:read" },
  { href: "/admin/audit", label: "Journal d’audit", icon: "audit", role: "FUNCTIONAL", permission: "audit:read" },
  { href: "/admin/reporting", label: "Reporting autorisé", icon: "reporting", role: "FUNCTIONAL", permission: "reporting:read" },
  { href: "/admin/technical", label: "Configuration technique", icon: "technical", role: "TECHNICAL", permission: "technical:manage" },
];

function AdminIcon({ kind }: { kind: AdminIconKind }) {
  const paths: Record<AdminIconKind, string> = {
    overview: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    users: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5A3 3 0 1 0 10 4.5a3 3 0 0 0 0 6ZM16 5a3 3 0 0 1 0 5.8M17 14.2a3.5 3.5 0 0 1 3 3.3V19",
    department: "M4 5h16v14H4zM8 5v14M4 10h4M12 9h5M12 13h5M12 17h3",
    queue: "M4 6h16v12H4zM4 10h16M8 14h3M14 14h3",
    team: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5A3 3 0 1 0 10 4.5a3 3 0 0 0 0 6ZM16 5a3 3 0 0 1 0 5.8M17 14.2a3.5 3.5 0 0 1 3 3.3V19",
    catalog: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    sla: "M12 5v7l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    notifications: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-7-3-9M10 21h4",
    tickets: "M4 6.5h16v4a2 2 0 0 0 0 3v4H4v-4a2 2 0 0 0 0-3v-4ZM9 9.5h6M9 14.5h4",
    audit: "M12 3 19 6v5.5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5V6l7-3ZM9 12l2 2 4-4",
    reporting: "M4 19V9M10 19V5M16 19v-7M22 19H2",
    technical: "M12 3a3 3 0 0 0-3 3v1.2a7 7 0 0 0-2.2 1.3L5.7 8a3 3 0 1 0-1.5 2.6l1.1.6a7 7 0 0 0 0 2.6l-1.1.6A3 3 0 1 0 5.7 17l1.1-1.5a7 7 0 0 0 2.2 1.3V18a3 3 0 1 0 6 0v-1.2a7 7 0 0 0 2.2-1.3l1.1 1.5a3 3 0 1 0 1.5-2.6l-1.1-.6a7 7 0 0 0 0-2.6l1.1-.6A3 3 0 1 0 18.3 8l-1.1 1.5A7 7 0 0 0 15 8.2V7a3 3 0 0 0-3-4Z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  };

  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d={paths[kind]} /></svg>;
}

export async function AdminShell({ user, children }: { user: UserContext; children: React.ReactNode }) {
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
      <div className="sidebar-brand-block admin-sidebar-brand-block">
        <div className="sidebar-reference-brand">
          <span className="sidebar-reference-mark sidebar-mark-1t" aria-hidden="true">1T</span>
          <span className="sidebar-brand-wordmark">1TASK</span>
          <span className="admin-console-chip">Admin</span>
        </div>
        <div className="admin-sidebar-intro">
          <p className="admin-sidebar-kicker">Console 1TASK</p>
          <p className="admin-sidebar-title">Administration</p>
          <p className="admin-sidebar-description">Configuration, supervision et traçabilité.</p>
        </div>
      </div>
      <nav aria-label="Navigation administration" className="sidebar-nav admin-sidebar-nav">
        {visibleLinks.map((link) => (
          <ShellNavLink key={link.href} href={link.href} icon={<AdminIcon kind={link.icon} />}>
            {link.label}
          </ShellNavLink>
        ))}
      </nav>
      <div className="sidebar-extra admin-sidebar-footer hidden border-t md:mt-auto md:block">
        <p className="admin-sidebar-footer-title">Périmètre administrateur</p>
        <p className="admin-sidebar-footer-value"><span className="admin-status-dot" />{functional ? "Fonctionnel global" : "Technique uniquement"}</p>
      </div>
    </>
  );

  const topbar = (
    <div className="topbar-layout">
      <GlobalSearch />
      <div className="topbar-actions">
        <NewTicketLauncher />
        <NotificationCenter />
        <HelpMenu />
        <ThemeToggle />
        <Link href="/dashboard" className="button-secondary hidden min-h-8 px-2.5 text-xs sm:inline-flex">Espace normal</Link>
        <ProfileMenu name={user.name} email={user.email} department="Console d’administration" roles={roleLabel} admin />
      </div>
    </div>
  );

  return <NotificationStateProvider><div className="admin-industrial"><CollapsibleShell variant="admin" sidebar={sidebar} topbar={topbar}>{children}</CollapsibleShell></div></NotificationStateProvider>;
}
