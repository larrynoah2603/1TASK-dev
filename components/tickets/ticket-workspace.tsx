import type { ReactNode } from "react";

export function TicketWorkspace({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ticket-workspace ${className}`.trim()} aria-label="Espace de travail tickets">{children}</section>;
}

export function TicketWorkspaceHeader({ children }: { children: ReactNode }) {
  return <header className="ticket-workspace-header">{children}</header>;
}

export function TicketWorkspaceToolbar({ children }: { children: ReactNode }) {
  return <div className="ticket-workspace-toolbar">{children}</div>;
}
