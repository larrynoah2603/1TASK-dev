import type { ReactNode } from "react";

/** Cadre présentationnel : logo · navigation filtrée par permissions · profil. */
export function AppSidebar({ brand, navigation, user }: { brand: ReactNode; navigation: ReactNode; user?: ReactNode }) {
  return (
    <>
      <div className="kit-sidebar-brand">{brand}</div>
      <div className="kit-sidebar-nav">{navigation}</div>
      {user ? <div className="kit-sidebar-foot">{user}</div> : null}
    </>
  );
}
