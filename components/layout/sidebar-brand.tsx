import Link from "next/link";
import { Icon } from "@/components/ui/icons";

/**
 * Visual branding shared by the app and admin shells.
 * The future suite app switch is intentionally disabled until applications,
 * access rights and navigation have been defined. No fictional menu entries.
 */
export function SidebarBrand({ admin = false }: { admin?: boolean }) {
  return (
    <>
      <Link
        href={admin ? "/admin" : "/dashboard"}
        className="kit-sidebar-brand-link"
        aria-label={admin ? "Console d’administration 1TASK" : "1TASK — accueil"}
      >
        <span className="kit-brand-mark" aria-hidden="true">1T</span>
        <span className="kit-brand-copy">
          <span className="kit-brand-heading">
            <span className="kit-brand-name">1TASK</span>
            {admin ? <span className="kit-brand-chip">Admin</span> : null}
          </span>
          <span className="kit-brand-subtitle">BIOS Expertise</span>
        </span>
      </Link>
      <button
        type="button"
        className="kit-app-switch"
        aria-label="Changer d’application — bientôt disponible"
        title="Changement d’application bientôt disponible"
        disabled
      >
        <Icon name="chevronDown" />
      </button>
    </>
  );
}
