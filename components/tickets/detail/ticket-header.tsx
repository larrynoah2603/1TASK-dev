import type { ReactNode } from "react";

export function TicketHeader({ children }: { children: ReactNode }) {
  return <header className="ticket-detail-header">{children}</header>;
}
