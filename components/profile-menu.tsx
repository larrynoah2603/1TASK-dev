"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown } from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { DensityToggle } from "@/components/density-toggle";

export function ProfileMenu({ name, email, image, department, roles, admin }: { name: string; email: string; image?: string | null; department: string; roles: string; admin?: boolean }) {
  return (
    <Dropdown
      triggerLabel="Menu utilisateur"
      triggerClassName="kit-user-trigger"
      panelClassName="kit-popover-menu kit-profile-popover"
      role="dialog"
      triggerContent={
        <>
          <Avatar name={name} image={image} status />
          <span className="kit-user-trigger-text"><span className="kit-user-trigger-name">{name}</span><span className="kit-user-trigger-sub">{department}</span></span>
          <span className="kit-user-chevron" aria-hidden="true"><Icon name="chevronDown" /></span>
        </>
      }
    >
      {(close) => (
        <>
          <div className="kit-menu-head">
            <p className="kit-menu-head-name">{name}</p>
            <p className="kit-menu-head-sub">{email}</p>
            <p className="kit-menu-head-sub">{roles}</p>
          </div>
          <div className="kit-menu">
            <Link href="/profile" onClick={close} className="kit-menu-item"><Icon name="user" />Mon compte</Link>
            {admin ? <Link href="/admin" onClick={close} className="kit-menu-item"><Icon name="shield" />Console d’administration</Link> : null}
            <div className="kit-menu-sep" role="separator" />
            <div className="kit-profile-preferences" aria-label="Préférences d’affichage">
              <div className="kit-profile-preference-row">
                <span className="kit-profile-preference-label">Thème</span>
                <ThemeToggle variant="segmented" />
              </div>
              <div className="kit-profile-preference-row">
                <span className="kit-profile-preference-label">Densité</span>
                <DensityToggle />
              </div>
            </div>
            <div className="kit-menu-sep" role="separator" />
            <Link href="/api/auth/signout" className="kit-menu-item kit-menu-item-danger"><Icon name="logout" />Se déconnecter</Link>
          </div>
        </>
      )}
    </Dropdown>
  );
}
