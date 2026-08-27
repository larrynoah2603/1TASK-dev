import { RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasGlobalRole } from "@/lib/access-control";
import { isFunctionalAssetAdministrator } from "@/lib/asset-access";
import { ROLE_LABELS } from "@/lib/identity";
import { CollapsibleShell } from "@/components/collapsible-shell";
import { GlobalSearch } from "@/components/global-search";
import { HelpMenu } from "@/components/help-menu";
import { NewTicketLauncher } from "@/components/new-ticket-launcher";
import { NotificationCenter } from "@/components/notification-center";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShellNavLink } from "@/components/shell-nav-link";
import { TopbarContext } from "@/components/topbar-context";
import { permissionCodes, roleCodes, toAccessSubject, type UserContext } from "@/lib/server-auth";

type AppIconKind = "home" | "ticket" | "inbox" | "team" | "chart" | "shield" | "bell" | "folder" | "briefcase" | "monitor" | "book";
type AppLink = { href: string; label: string; icon: AppIconKind; group: "Espace" | "Opérations" | "Administration"; permission?: string; roles?: RoleCode[] };

const links: AppLink[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "home", group: "Espace" },
  { href: "/profile", label: "Mon profil", icon: "team", group: "Espace" },
  { href: "/notifications", label: "Notifications", icon: "bell", group: "Espace" },
  { href: "/tickets", label: "Mes tickets", icon: "ticket", group: "Espace" },
  { href: "/inbox", label: "Boîte agent", icon: "inbox", group: "Opérations", roles: [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] },
  { href: "/clients", label: "Clients", icon: "team", group: "Opérations", permission: "portfolio:read" },
  { href: "/dossiers", label: "Dossiers clients", icon: "folder", group: "Opérations", permission: "portfolio:read" },
  { href: "/missions", label: "Missions", icon: "briefcase", group: "Opérations", permission: "portfolio:read" },
  { href: "/assets", label: "Actifs", icon: "monitor", group: "Opérations", roles: [RoleCode.FUNCTIONAL_ADMIN] },
  { href: "/knowledge", label: "Base de connaissances", icon: "book", group: "Espace", permission: "knowledge:read" },
  { href: "/dashboard/responsible", label: "Pilotage SLA", icon: "team", group: "Opérations", permission: "reporting:read" },
  { href: "/reporting", label: "Reporting", icon: "chart", group: "Opérations", permission: "reporting:read" },
  { href: "/admin", label: "Administration", icon: "shield", group: "Administration", roles: [RoleCode.FUNCTIONAL_ADMIN, RoleCode.TECHNICAL_ADMIN] },
];

function AppIcon({ kind }: { kind: AppIconKind }) {
  const paths: Record<AppIconKind, string> = {
    home: "M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5",
    ticket: "M4 6.5h16v4a2 2 0 0 0 0 3v4H4v-4a2 2 0 0 0 0-3v-4ZM9 9.5h6M9 14.5h4",
    inbox: "M4 5.5h16v13H4zM4 14h4l1.5 2h5L16 14h4M8 9h8",
    team: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5A3 3 0 1 0 10 4.5a3 3 0 0 0 0 6ZM16 5a3 3 0 0 1 0 5.8M17 14.2a3.5 3.5 0 0 1 3 3.3V19",
    chart: "M4 19V9M10 19V5M16 19v-7M22 19H2",
    shield: "M12 3 19 6v5.5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5V6l7-3ZM9 12l2 2 4-4",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-7-3-9M10 21h4",
    folder: "M3 6.5h7l2 2h9v10H3zM3 9h18",
    briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 12h16M10 12v2h4v-2",
    monitor: "M4 5h16v11H4zM8 20h8M12 16v4",
    book: "M4 4.5h6A2 2 0 0 1 12 6.5v13a2 2 0 0 0-2-2H4zM20 4.5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z",
  };
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d={paths[kind]} /></svg>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "1T";
}

function SidebarBrand() {
  return (
    <div className="sidebar-reference-brand">
      <span className="sidebar-reference-mark sidebar-mark-1t" aria-hidden="true">1T</span>
      <span className="sidebar-brand-wordmark">1TASK</span>
    </div>
  );
}

export async function AppShell({ user, children }: { user: UserContext; children: React.ReactNode }) {
  const unreadCount = await prisma.notification.count({ where: { recipientId: user.id, readAt: null } });
  const codes = roleCodes(user);
  const permissions = permissionCodes(user);
  const subject = toAccessSubject(user);
  const isAdmin = hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN) || hasGlobalRole(subject, RoleCode.TECHNICAL_ADMIN);
  const canCreate = permissions.includes("ticket:create");
  const visibleLinks = links.filter((link) => {
    const permissionAllowed = !link.permission || permissions.includes(link.permission);
    const roleAllowed = !link.roles || link.roles.some((role) => codes.includes(role));
    const adminAllowed = link.href !== "/admin" || isAdmin;
    const assetsAllowed = link.href !== "/assets" || isFunctionalAssetAdministrator(user);
    return permissionAllowed && roleAllowed && adminAllowed && assetsAllowed;
  });
  const groups: Array<AppLink["group"]> = ["Espace", "Opérations", "Administration"];
  const roleLabel = codes.map((code) => ROLE_LABELS[code]).join(" · ");
  const sidebar = (
    <>
      <div className="sidebar-brand-block">
        <SidebarBrand />
      </div>
      <nav aria-label="Navigation ticketing" className="sidebar-nav">
        {groups.map((group) => {
          const groupLinks = visibleLinks.filter((link) => link.group === group);
          if (!groupLinks.length) return null;
          return <div key={group} className="sidebar-nav-group"><p className="sidebar-label">{group}</p>{groupLinks.map((link) => <ShellNavLink key={link.href} href={link.href} icon={<AppIcon kind={link.icon} />}><span className="flex min-w-0 items-center gap-2 truncate">{link.label}{link.href === "/notifications" && unreadCount > 0 ? <span className="nav-notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}</span></ShellNavLink>)}</div>;
        })}
      </nav>
      <div className="sidebar-user-block sidebar-user-block-industrial sidebar-extra hidden md:block"><div className="sidebar-user-avatar">{user.image ? <img src={user.image} alt="" /> : initials(user.name)}</div><div className="min-w-0"><p className="sidebar-user-name truncate">{user.name}</p><p className="sidebar-user-context truncate">{user.department?.name ?? "Service desk interne"}</p></div></div>
    </>
  );
  const topbar = <div className="topbar-layout topbar-layout-industrial"><TopbarContext /><div className="topbar-search-slot"><GlobalSearch /></div><div className="topbar-actions topbar-actions-industrial">{canCreate ? <NewTicketLauncher /> : null}<NotificationCenter initialUnreadCount={unreadCount} /><HelpMenu /><ThemeToggle /><ProfileMenu name={user.name} email={user.email} image={user.image} department={user.department?.name ?? "Département non renseigné"} roles={roleLabel} admin={isAdmin} /></div></div>;
  return <CollapsibleShell variant="app" sidebar={sidebar} topbar={topbar}>{children}</CollapsibleShell>;
}
