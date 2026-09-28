import type { ReactNode } from "react";

export function Sidebar({ brand, navigation, user }: { brand: ReactNode; navigation: ReactNode; user: ReactNode }) {
  return <div className="enterprise-sidebar">
    <div className="enterprise-sidebar-brand">{brand}</div>
    <div className="enterprise-sidebar-scroll">{navigation}</div>
    <div className="enterprise-sidebar-user">{user}</div>
  </div>;
}
