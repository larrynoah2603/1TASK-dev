import Link from "next/link";
import { RoleCode } from "@prisma/client";
import { hasGlobalRole } from "@/lib/access-control";
import { ROLE_LABELS } from "@/lib/identity";
import { CollapsibleShell } from "@/components/collapsible-shell";
import { GlobalSearch } from "@/components/global-search";
import { HelpMenu } from "@/components/help-menu";
import { NotificationCenter } from "@/components/notification-center";
import { TopbarContext } from "@/components/topbar-context";
import { TopHeader } from "@/components/layout/top-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { Icon, type IconName } from "@/components/ui/icons";
import { NotificationProvider } from "@/components/notification-state";
import { ProfileMenu } from "@/components/profile-menu";
import { ShellNavLink } from "@/components/shell-nav-link";
import { NewTicketLauncher } from "@/components/new-ticket-launcher";
import { permissionCodes, roleCodes, toAccessSubject, type UserContext } from "@/lib/server-auth";
import { getProductCapabilities } from "@/lib/product-policy.server";
import { readServerEnvironment } from "@/lib/env";

type AdminLink = {
  href: string;
  label: string;
  icon: IconName;
  permission?: string;
  role: "FUNCTIONAL" | "TECHNICAL" | "ANY";
  hiddenInV1?: boolean;
};

const adminLinks: AdminLink[] = [
  { href: "/admin", label: "Vue d’ensemble", icon: "dashboard", role: "ANY" },
  { href: "/admin/users", label: "Utilisateurs", icon: "users", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/roles", label: "Rôles & permissions", icon: "shield", role: "FUNCTIONAL", permission: "organization:manage", hiddenInV1: true },
  { href: "/admin/departments", label: "Départements / Entra", icon: "folder", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/queues", label: "Files et responsables", icon: "layers", role: "FUNCTIONAL", permission: "organization:manage" },
  { href: "/admin/teams", label: "Équipes et agents", icon: "users", role: "FUNCTIONAL", permission: "organization:manage", hiddenInV1: true },
  { href: "/admin/catalog", label: "Catalogue de services", icon: "book", role: "FUNCTIONAL", permission: "catalog:manage" },
  { href: "/admin/sla", label: "SLA et escalades", icon: "clock", role: "FUNCTIONAL", permission: "sla:manage" },
  { href: "/admin/notifications", label: "Notifications", icon: "bell", role: "FUNCTIONAL", permission: "organization:manage", hiddenInV1: true },
  { href: "/admin/tickets", label: "Supervision des tickets", icon: "ticket", role: "FUNCTIONAL", permission: "ticket:read", hiddenInV1: true },
  { href: "/admin/audit", label: "Journal d’audit", icon: "shield", role: "FUNCTIONAL", permission: "audit:read" },
  { href: "/admin/reporting", label: "Reporting autorisé", icon: "chart", role: "FUNCTIONAL", permission: "reporting:read", hiddenInV1: true },
  { href: "/admin/technical", label: "Configuration technique", icon: "sliders", role: "TECHNICAL", permission: "technical:manage", hiddenInV1: true },
];

export async function AdminShell({ user, children }: { user: UserContext; children: React.ReactNode }) {
  const capabilities = getProductCapabilities();
  const profile = readServerEnvironment().PRODUCT_PROFILE;
  const subject = toAccessSubject(user);
  const codes = roleCodes(user);
  const permissions = permissionCodes(user);
  const functional = hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN);
  const technical = hasGlobalRole(subject, RoleCode.TECHNICAL_ADMIN);
  const visibleLinks = adminLinks.filter((link) => {
    const roleAllowed = link.role === "ANY" || (link.role === "FUNCTIONAL" ? functional : technical);
    const profileAllowed = !(link.hiddenInV1 && profile === "v1");
    return roleAllowed && (!link.permission || permissions.includes(link.permission)) && profileAllowed;
  });
  const roleLabel = codes.map((code) => ROLE_LABELS[code]).join(" · ");

  const sidebar = (
    <AppSidebar
      brand={
        <SidebarBrand admin />
      }
      navigation={
        <nav aria-label="Navigation administration">
          <section className="kit-nav-section" aria-label="Console d’administration">
            <p className="kit-nav-label">Console d’administration</p>
            {visibleLinks.map((link) => (
              <ShellNavLink key={link.href} href={link.href} title={link.label} icon={<Icon name={link.icon} />}>
                {link.label}
              </ShellNavLink>
            ))}
          </section>
        </nav>
      }
      user={
        <div className="kit-user-card" title="Périmètre administrateur">
          <span className="kit-nav-icon" aria-hidden="true"><Icon name="shield" /></span>
          <span className="kit-user-card-text"><p className="kit-user-card-name">Périmètre administrateur</p><p className="kit-user-card-sub">{functional ? "Fonctionnel global" : "Technique uniquement"}</p></span>
        </div>
      }
    />
  );

  const topbar = (
    <TopHeader
      context={<TopbarContext />}
      search={<GlobalSearch />}
      actions={
        <>
          <NewTicketLauncher simplified={!capabilities.confidentialTicketCreation && !capabilities.productionPortfolio} />
          <NotificationCenter />
          <span className="kit-hide-mobile"><HelpMenu /></span>
          <Link href="/dashboard" className="kit-btn kit-btn-secondary kit-btn-sm kit-hide-mobile">Espace normal</Link>
          <span className="kit-topbar-divider" aria-hidden="true" />
          <ProfileMenu name={user.name} email={user.email} image={user.image} department="Console d’administration" roles={roleLabel} admin />
        </>
      }
    />
  );

  return <NotificationProvider><CollapsibleShell variant="admin" sidebar={sidebar} topbar={topbar}><div className="admin-industrial">{children}</div></CollapsibleShell></NotificationProvider>;
}
