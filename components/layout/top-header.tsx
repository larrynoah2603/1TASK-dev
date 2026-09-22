import type { ReactNode } from "react";

export function TopHeader({ context, search, actions }: { context: ReactNode; search: ReactNode; actions: ReactNode }) {
  return (
    <div className="topbar-layout topbar-layout-industrial">
      {context}
      <div className="topbar-search-slot">{search}</div>
      <div className="topbar-actions topbar-actions-industrial">{actions}</div>
    </div>
  );
}
