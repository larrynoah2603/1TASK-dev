import type { ReactNode } from "react";

export function TopHeader({ context, search, actions }: { context: ReactNode; search: ReactNode; actions: ReactNode }) {
  return (
    <div className="topbar-layout topbar-layout-industrial enterprise-topbar">
      <div className="enterprise-topbar-context">{context}</div>
      <div className="topbar-search-slot enterprise-topbar-search">{search}</div>
      <div className="topbar-actions topbar-actions-industrial enterprise-topbar-actions">{actions}</div>
    </div>
  );
}
