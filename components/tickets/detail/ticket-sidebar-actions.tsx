import type { ReactNode } from "react";

export function TicketSidebarActions({ children }: { children: ReactNode }) {
  return <section aria-labelledby="ticket-actions-title"><h2 id="ticket-actions-title" className="sr-only">Actions ticket</h2>{children}</section>;
}
