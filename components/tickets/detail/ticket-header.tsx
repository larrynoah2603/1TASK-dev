import type { ReactNode } from "react";

export function TicketHeader({ children }: { children: ReactNode }) {
  return <header className="kit-card kit-ticket-head">{children}</header>;
}
