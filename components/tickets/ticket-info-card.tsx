import type { ReactNode } from "react";

export function TicketInfoCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ticket-info-card"><h2>{title}</h2><div>{children}</div></section>;
}
