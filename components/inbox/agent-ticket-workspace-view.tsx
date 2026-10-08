"use client";

import { useState } from "react";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { AgentTicketTable } from "@/components/inbox/agent-ticket-table";
import { AgentTicketKanban } from "@/components/inbox/agent-ticket-kanban";

type InboxLayout = "list" | "kanban";

export function AgentTicketWorkspaceView({
  tickets,
  claimableTicketIds,
}: {
  tickets: DashboardTicketRow[];
  claimableTicketIds: string[];
}) {
  const [layout, setLayout] = useState<InboxLayout>("list");

  return (
    <div className="agent-ticket-layout">
      <div className="agent-ticket-layout-toolbar">
        <div>
          <strong>Affichage</strong>
          <span>La vue Kanban est en consultation uniquement.</span>
        </div>
        <div className="agent-ticket-layout-switcher" role="group" aria-label="Mode d'affichage des tickets">
          <button
            type="button"
            className={layout === "list" ? "is-active" : ""}
            aria-pressed={layout === "list"}
            onClick={() => setLayout("list")}
          >
            Liste
          </button>
          <button
            type="button"
            className={layout === "kanban" ? "is-active" : ""}
            aria-pressed={layout === "kanban"}
            onClick={() => setLayout("kanban")}
          >
            Kanban
          </button>
        </div>
      </div>

      {layout === "kanban"
        ? <AgentTicketKanban tickets={tickets} />
        : <AgentTicketTable tickets={tickets} claimableTicketIds={claimableTicketIds} />}
    </div>
  );
}
