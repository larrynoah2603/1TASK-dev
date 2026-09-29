import type { ReactNode } from "react";

export function TicketConversation({ children }: { children: ReactNode }) {
  return <section aria-labelledby="ticket-conversation-title"><h2 id="ticket-conversation-title" className="sr-only">Conversation</h2>{children}</section>;
}
