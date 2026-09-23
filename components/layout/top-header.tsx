import type { ReactNode } from "react";

export function TopHeader({ context, search, actions }: { context: ReactNode; search: ReactNode; actions: ReactNode }) {
  return (
    <div className="topbar-layout topbar-layout-industrial enterprise-topbar header-reference-frame">
      <div className="enterprise-topbar-context header-reference-context">{context}</div>
      <div className="topbar-search-slot enterprise-topbar-search header-reference-search">{search}</div>
      <div className="topbar-actions topbar-actions-industrial enterprise-topbar-actions header-reference-actions" aria-label="Actions utilisateur">{actions}</div>
    </div>
  );
}
