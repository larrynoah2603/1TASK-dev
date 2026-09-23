"use client";

import { useState, type ReactNode } from "react";

export function TicketTabs({ summary, conversation, history, attachments, links }: { summary: ReactNode; conversation: ReactNode; history: ReactNode; attachments: ReactNode; links: ReactNode }) {
  const [active, setActive] = useState("summary");
  const tabs = [{ id: "summary", label: "Résumé", content: summary }, { id: "conversation", label: "Conversation", content: conversation }, { id: "history", label: "Historique", content: history }, { id: "attachments", label: "Pièces jointes", content: attachments }, { id: "links", label: "Liens", content: links }];
  return <div className="ticket-tabs"><div role="tablist" aria-label="Sections du ticket" className="ticket-tabs-list">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} className={active === tab.id ? "ticket-tab is-active" : "ticket-tab"} onClick={() => setActive(tab.id)}>{tab.label}</button>)}</div><div className="ticket-tab-panel" role="tabpanel">{tabs.find((tab) => tab.id === active)?.content}</div></div>;
}
