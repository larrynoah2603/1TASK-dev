import type { ReactNode } from "react";

/** Presentational frame for the permission-filtered application navigation. */
export function AppSidebar({ brand, navigation, user }: { brand: ReactNode; navigation: ReactNode; user: ReactNode }) {
  return (
    <div className="app-sidebar-frame">
      <div className="app-sidebar-brand">{brand}</div>
      <div className="app-sidebar-navigation">{navigation}</div>
      <div className="app-sidebar-user">{user}</div>
    </div>
  );
}
