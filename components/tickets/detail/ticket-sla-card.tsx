import type { ReactNode } from "react";

export function TicketSlaCard({ children }: { children: ReactNode }) {
  return <section aria-labelledby="ticket-sla-title"><h2 id="ticket-sla-title" className="sr-only">SLA</h2>{children}</section>;
}
