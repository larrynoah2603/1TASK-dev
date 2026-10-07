"use client";

import { useState, type ReactNode } from "react";

type TicketWorkspaceTab = "conversation" | "history" | "attachments";

export function TicketWorkspaceTabs({
  conversation,
  history,
  attachments,
  messageCount,
  historyCount,
}: {
  conversation: ReactNode;
  history: ReactNode;
  attachments: ReactNode;
  messageCount: number;
  historyCount: number;
}) {
  const [active, setActive] = useState<TicketWorkspaceTab>("conversation");

  const tabs: Array<{ key: TicketWorkspaceTab; label: string; count?: number }> = [
    { key: "conversation", label: "Échanges", count: messageCount },
    { key: "history", label: "Historique", count: historyCount },
    { key: "attachments", label: "Fichiers" },
  ];

  return (
    <section className="ticket-workspace-tabs" aria-label="Activité du ticket">
      <div className="ticket-workspace-tablist" role="tablist" aria-label="Vue du ticket">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={`ticket-workspace-panel-${tab.key}`}
            id={`ticket-workspace-tab-${tab.key}`}
            className={`ticket-workspace-tab${active === tab.key ? " ticket-workspace-tab-active" : ""}`}
            onClick={() => setActive(tab.key)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? <span className="ticket-workspace-tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div
        id={`ticket-workspace-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`ticket-workspace-tab-${active}`}
        className="ticket-workspace-tabpanel"
      >
        {active === "conversation" ? conversation : null}
        {active === "history" ? history : null}
        {active === "attachments" ? attachments : null}
      </div>
    </section>
  );
}
