import type { ReactNode } from "react";

export function TicketSidebarActions({ children }: { children: ReactNode }) {
  return <section className="ticket-actions-premium" aria-labelledby="ticket-actions-title"><div className="ticket-section-heading"><div><p className="eyebrow">Pilotage</p><h2 id="ticket-actions-title">Actions du ticket</h2><p>Intervenez sans quitter le contexte.</p></div></div>{children}</section>;
}
