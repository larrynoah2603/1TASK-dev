"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

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
  const tabRefs = useRef<Record<TicketWorkspaceTab, HTMLButtonElement | null>>({
    conversation: null,
    history: null,
    attachments: null,
  });

  const tabs: Array<{ key: TicketWorkspaceTab; label: string; count?: number }> = [
    { key: "conversation", label: "Échanges", count: messageCount },
    { key: "history", label: "Historique", count: historyCount },
    { key: "attachments", label: "Fichiers" },
  ];

  function activateFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = tabs[nextIndex];
    setActive(next.key);
    tabRefs.current[next.key]?.focus();
  }

  const contentByTab: Record<TicketWorkspaceTab, ReactNode> = {
    conversation,
    history,
    attachments,
  };

  return (
    <section className="ticket-workspace-tabs" aria-label="Activité du ticket">
      <div className="ticket-workspace-tablist" role="tablist" aria-label="Vue du ticket">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(node) => { tabRefs.current[tab.key] = node; }}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={`ticket-workspace-panel-${tab.key}`}
            id={`ticket-workspace-tab-${tab.key}`}
            tabIndex={active === tab.key ? 0 : -1}
            className={`ticket-workspace-tab${active === tab.key ? " ticket-workspace-tab-active" : ""}`}
            onClick={() => setActive(tab.key)}
            onKeyDown={(event) => activateFromKeyboard(event, index)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? <span className="ticket-workspace-tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.key}
          id={`ticket-workspace-panel-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`ticket-workspace-tab-${tab.key}`}
          className="ticket-workspace-tabpanel"
          hidden={active !== tab.key}
        >
          {active === tab.key ? contentByTab[tab.key] : null}
        </div>
      ))}
    </section>
  );
}
