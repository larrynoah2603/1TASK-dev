import type { ReactNode } from "react";

/** Carte de la fiche ticket : en-tête (titre, sous-titre, compteur ou action) + contenu. */
export function TicketPanel({ title, subtitle, count, action, children, flush = false }: { title: string; subtitle?: string; count?: number; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className="kit-panel">
      <header className="kit-panel-head">
        <div>
          <h2 className="kit-panel-title">{title}</h2>
          {subtitle ? <p className="kit-panel-sub">{subtitle}</p> : null}
        </div>
        {typeof count === "number" ? <span className="kit-count">{count}</span> : action ?? null}
      </header>
      <div className={flush ? undefined : "kit-panel-body"}>{children}</div>
    </section>
  );
}
