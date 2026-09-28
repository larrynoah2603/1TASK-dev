import type { ReactNode } from "react";

export function TicketConversation({ children }: { children: ReactNode }) {
  return <section className="ticket-conversation-premium" aria-labelledby="ticket-conversation-title"><div className="ticket-section-heading"><div><p className="eyebrow">Échanges</p><h2 id="ticket-conversation-title">Conversation</h2><p>Suivez les réponses, les décisions et les prochaines actions.</p></div><span className="ticket-section-badge">Activité</span></div>{children}</section>;
}
