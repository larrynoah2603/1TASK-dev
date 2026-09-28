import type { ReactNode } from "react";

export function Topbar({ context, search, actions }: { context: ReactNode; search: ReactNode; actions: ReactNode }) {
  return <div className="enterprise-header">
    <div className="enterprise-header-context">{context}</div>
    <div className="enterprise-header-search">{search}</div>
    <div className="enterprise-header-actions" aria-label="Actions utilisateur">{actions}</div>
  </div>;
}
