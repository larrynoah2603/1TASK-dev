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
import { getProductCapabilities } from "@/lib/product-policy.server";
import type { ProductCapability } from "@/lib/product-policy";
import { countOperationalTickets } from "@/lib/ticket-query-service";

/**
 * group "main"    : navigation principale
 * group "account" : administration et paramètres
 * group "mobile"  : présent uniquement dans la barre mobile (déjà accessible via la cloche / le menu utilisateur)
 */
type AppLink = { href: string; label: string; icon: IconName; group: "main" | "account" | "mobile"; permission?: string; roles?: RoleCode[]; capability?: ProductCapability; hiddenInV1?: boolean };

const links: AppLink[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "dashboard", group: "main" },
  { href: "/tickets", label: "Mes tickets", icon: "ticket", group: "main" },
  { href: "/inbox", label: "Boîte agent", icon: "inbox", group: "main", roles: [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] },
  { href: "/missions", label: "Missions", icon: "briefcase", group: "main", permission: "portfolio:read", capability: "productionPortfolio" },
  { href: "/queues", label: "Files", icon: "layers", group: "main", roles: [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] },
  { href: "/clients", label: "Clients", icon: "users", group: "main", permission: "portfolio:read", capability: "productionPortfolio" },
  { href: "/dossiers", label: "Dossiers", icon: "folder", group: "main", permission: "portfolio:read", capability: "productionPortfolio" },
  { href: "/knowledge", label: "Connaissances", icon: "book", group: "main", permission: "knowledge:read", capability: "knowledge" },
  { href: "/reporting", label: "Reporting", icon: "chart", group: "main", permission: "reporting:read" },
  { href: "/dashboard/responsible", label: "Pilotage SLA", icon: "clock", group: "main", permission: "reporting:read", hiddenInV1: true },
  { href: "/my-assets", label: "Mes actifs", icon: "monitor", group: "main" },
  { href: "/assets", label: "Inventaire", icon: "monitor", group: "main", roles: [RoleCode.FUNCTIONAL_ADMIN], capability: "productionPortfolio" },
  { href: "/asset-requests", label: "Demandes d’actifs", icon: "clipboard", group: "main", roles: [RoleCode.FUNCTIONAL_ADMIN], capability: "productionPortfolio" },
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
  const capabilities = getProductCapabilities();
  const codes = roleCodes(user);
  const permissions = permissionCodes(user);
  const subject = toAccessSubject(user);
  const isAdmin = hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN) || hasGlobalRole(subject, RoleCode.TECHNICAL_ADMIN);
  const canCreate = permissions.includes("ticket:create");
  const canUseInbox = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN]
    .some((role) => codes.includes(role));
  const inboxTicketCount = canUseInbox ? await countOperationalTickets(user) : 0;
  // Règles d'affichage inchangées : permission, rôle, administrateur, administrateur fonctionnel des actifs.
  const visibleLinks = links.filter((link) => {
    const permissionAllowed = !link.permission || permissions.includes(link.permission);
    const roleAllowed = !link.roles || link.roles.some((role) => codes.includes(role));
    const adminAllowed = link.href !== "/admin" || isAdmin;
    const assetsAllowed = link.href !== "/assets" || isFunctionalAssetAdministrator(user);
    const capabilityAllowed = (!link.capability || capabilities[link.capability]) && !(link.hiddenInV1 && !capabilities.productionPortfolio);
    return permissionAllowed && roleAllowed && adminAllowed && assetsAllowed && capabilityAllowed;
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
            {sectionLinks.map((link) => (
              <ShellNavLink key={link.href} href={link.href} title={link.label} icon={<Icon name={link.icon} />}>
                {link.label}
                {link.href === "/inbox" && inboxTicketCount > 0 ? (
                  <span
                    className="kit-nav-count"
                    aria-label={`${inboxTicketCount} ticket${inboxTicketCount > 1 ? "s" : ""} à traiter ou à consulter`}
                  >
                    {inboxTicketCount > 99 ? "99+" : inboxTicketCount}
                  </span>
                ) : null}
              </ShellNavLink>
            ))}
          </section>
        );
      })}
    </nav>}
    user={<Link href="/profile" className="kit-user-card sidebar-user-block-industrial" title={user.name}><Avatar name={user.name} image={user.image} status /><span className="kit-user-card-text"><p className="kit-user-card-name">{user.name}</p><p className="kit-user-card-sub">{department}</p></span></Link>}
  />;
  const topbar = <TopHeader context={<TopbarContext />} search={<span className="topbar-layout-industrial"><GlobalSearch /></span>} actions={<>{canCreate ? <NewTicketLauncher simplified={!capabilities.confidentialTicketCreation && !capabilities.productionPortfolio} /> : null}<NotificationCenter /><span className="kit-hide-mobile"><HelpMenu /></span><span className="kit-hide-mobile"><ThemeToggle /></span><span className="kit-topbar-divider" aria-hidden="true" /><ProfileMenu name={user.name} email={user.email} image={user.image} department={user.department?.name ?? "Département non renseigné"} roles={roleLabel} admin={isAdmin} /></>} />;
  const mobileNavigation = <MobileNavigation links={visibleLinks.map((link) => ({
    href: link.href,
    label: link.label,
    icon: <Icon name={link.icon} />,
    badge: link.href === "/inbox" ? inboxTicketCount : undefined,
  }))} />;
  return <NotificationProvider><CollapsibleShell variant="app" sidebar={sidebar} topbar={topbar} mobileNavigation={mobileNavigation}>{children}</CollapsibleShell></NotificationProvider>;
}
