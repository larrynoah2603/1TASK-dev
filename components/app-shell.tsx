import { RoleCode } from "@prisma/client";
import Link from "next/link";
import { hasGlobalRole } from "@/lib/access-control";
import { isFunctionalAssetAdministrator } from "@/lib/asset-access";
import { ROLE_LABELS } from "@/lib/identity";
import { CollapsibleShell } from "@/components/collapsible-shell";
import { GlobalSearch } from "@/components/global-search";
import { HelpMenu } from "@/components/help-menu";
import { NewTicketLauncher } from "@/components/new-ticket-launcher";
import { NotificationCenter } from "@/components/notification-center";
import { NotificationProvider } from "@/components/notification-state";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShellNavLink } from "@/components/shell-nav-link";
import { TopbarContext } from "@/components/topbar-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icons";
import { permissionCodes, roleCodes, toAccessSubject, type UserContext } from "@/lib/server-auth";

/**
 * group "main"    : navigation principale
 * group "account" : administration et paramètres
 * group "mobile"  : présent uniquement dans la barre mobile (déjà accessible via la cloche / le menu utilisateur)
 */
type AppLink = { href: string; label: string; icon: IconName; group: "main" | "account" | "mobile"; permission?: string; roles?: RoleCode[] };

const links: AppLink[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "dashboard", group: "main" },
  { href: "/tickets", label: "Tickets", icon: "ticket", group: "main" },
  { href: "/inbox", label: "Boîte agent", icon: "inbox", group: "main", roles: [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] },
  { href: "/missions", label: "Missions", icon: "briefcase", group: "main", permission: "portfolio:read" },
  { href: "/queues", label: "Files", icon: "layers", group: "main", roles: [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] },
  { href: "/clients", label: "Clients", icon: "users", group: "main", permission: "portfolio:read" },
  { href: "/dossiers", label: "Dossiers", icon: "folder", group: "main", permission: "portfolio:read" },
  { href: "/knowledge", label: "Connaissances", icon: "book", group: "main", permission: "knowledge:read" },
  { href: "/reporting", label: "Reporting", icon: "chart", group: "main", permission: "reporting:read" },
  { href: "/dashboard/responsible", label: "Pilotage SLA", icon: "clock", group: "main", permission: "reporting:read" },
  { href: "/assets", label: "Actifs", icon: "monitor", group: "main", roles: [RoleCode.FUNCTIONAL_ADMIN] },
  { href: "/admin", label: "Administration", icon: "shield", group: "account", roles: [RoleCode.FUNCTIONAL_ADMIN, RoleCode.TECHNICAL_ADMIN] },
  { href: "/profile", label: "Paramètres", icon: "sliders", group: "account" },
  { href: "/notifications", label: "Notifications", icon: "bell", group: "mobile" },
];

function SidebarBrand() {
  return (
    <Link href="/dashboard" className="kit-sidebar-brand-link" aria-label="1TASK — accueil">
      <span className="kit-brand-mark" aria-hidden="true">1T</span>
      <span className="kit-brand-name">1TASK</span>
    </Link>
  );
}

export async function AppShell({ user, children }: { user: UserContext; children: React.ReactNode }) {
  const codes = roleCodes(user);
  const permissions = permissionCodes(user);
  const subject = toAccessSubject(user);
  const isAdmin = hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN) || hasGlobalRole(subject, RoleCode.TECHNICAL_ADMIN);
  const canCreate = permissions.includes("ticket:create");
  // Règles d'affichage inchangées : permission, rôle, administrateur, administrateur fonctionnel des actifs.
  const visibleLinks = links.filter((link) => {
    const permissionAllowed = !link.permission || permissions.includes(link.permission);
    const roleAllowed = !link.roles || link.roles.some((role) => codes.includes(role));
    const adminAllowed = link.href !== "/admin" || isAdmin;
    const assetsAllowed = link.href !== "/assets" || isFunctionalAssetAdministrator(user);
    return permissionAllowed && roleAllowed && adminAllowed && assetsAllowed;
  });
  const sections: Array<{ id: "main" | "account"; label: string }> = [
    { id: "main", label: "Espace de travail" },
    { id: "account", label: isAdmin ? "Administration" : "Compte" },
  ];
  const roleLabel = codes.map((code) => ROLE_LABELS[code]).join(" · ");
  const department = user.department?.name ?? "Service desk interne";

  const sidebar = <AppSidebar
    brand={<SidebarBrand />}
    navigation={<nav aria-label="Navigation ticketing">
      {sections.map((section) => {
        const sectionLinks = visibleLinks.filter((link) => link.group === section.id);
        if (!sectionLinks.length) return null;
        return (
          <section key={section.id} className="kit-nav-section" aria-labelledby={`sidebar-group-${section.id}`}>
            <p id={`sidebar-group-${section.id}`} className="kit-nav-label">{section.label}</p>
            {sectionLinks.map((link) => <ShellNavLink key={link.href} href={link.href} title={link.label} icon={<Icon name={link.icon} />}>{link.label}</ShellNavLink>)}
          </section>
        );
      })}
    </nav>}
    user={<Link href="/profile" className="kit-user-card" title={user.name}><Avatar name={user.name} image={user.image} status /><span className="kit-user-card-text"><p className="kit-user-card-name">{user.name}</p><p className="kit-user-card-sub">{department}</p></span></Link>}
  />;
  const topbar = <TopHeader context={<TopbarContext />} search={<GlobalSearch />} actions={<>{canCreate ? <NewTicketLauncher /> : null}<NotificationCenter /><span className="kit-hide-mobile"><HelpMenu /></span><span className="kit-hide-mobile"><ThemeToggle /></span><span className="kit-topbar-divider" aria-hidden="true" /><ProfileMenu name={user.name} email={user.email} image={user.image} department={user.department?.name ?? "Département non renseigné"} roles={roleLabel} admin={isAdmin} /></>} />;
  const mobileNavigation = <MobileNavigation links={visibleLinks.map((link) => ({ href: link.href, label: link.label, icon: <Icon name={link.icon} /> }))} />;
  return <NotificationProvider><CollapsibleShell variant="app" sidebar={sidebar} topbar={topbar} mobileNavigation={mobileNavigation}>{children}</CollapsibleShell></NotificationProvider>;
}
