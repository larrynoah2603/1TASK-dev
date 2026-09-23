import type { ReactNode } from "react";

/** Presentational frame for the permission-filtered application navigation. */
export function AppSidebar({ brand, navigation, user }: { brand: ReactNode; navigation: ReactNode; user: ReactNode }) {
  return (
    <div className="app-sidebar-frame sidebar-reference-frame">
      <div className="app-sidebar-brand sidebar-reference-header">{brand}</div>
      <div className="app-sidebar-navigation sidebar-reference-navigation">{navigation}</div>
      <div className="app-sidebar-user sidebar-reference-footer">{user}</div>
    </div>
  );
}
