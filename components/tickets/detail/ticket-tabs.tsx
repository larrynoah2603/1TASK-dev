import type { ReactNode } from "react";

export function TicketTabs({ children }: { children: ReactNode }) {
  return <div className="ticket-detail-tabs" role="tablist" aria-label="Sections du ticket">{children}</div>;
}
