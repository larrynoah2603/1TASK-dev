import type { ReactNode } from "react";

export function TicketHistory({ children }: { children: ReactNode }) {
  return <section aria-labelledby="ticket-history-title"><h2 id="ticket-history-title" className="sr-only">Historique du ticket</h2>{children}</section>;
}
