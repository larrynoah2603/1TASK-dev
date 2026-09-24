import type { ReactNode } from "react";

export function TicketSummary({ children }: { children: ReactNode }) {
  return <section aria-labelledby="ticket-summary-title" className="ticket-side-panel-card"><h2 id="ticket-summary-title" className="sr-only">Informations ticket</h2>{children}</section>;
}
