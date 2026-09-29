import type { ReactNode } from "react";

/** Trois zones alignées sur la grille de .kit-topbar : contexte · recherche · actions. */
export function TopHeader({ context, search, actions }: { context: ReactNode; search: ReactNode; actions: ReactNode }) {
  return (
    <>
      <div className="kit-topbar-left">{context}</div>
      <div className="kit-topbar-center">{search}</div>
      <div className="kit-topbar-right" role="group" aria-label="Actions utilisateur">{actions}</div>
    </>
  );
}
