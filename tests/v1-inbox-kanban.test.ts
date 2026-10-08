import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V1 agent inbox consultation kanban", () => {
  it("keeps list as the default view and exposes a Kanban consultation toggle", () => {
    const workspace = source("components/inbox/agent-ticket-workspace-view.tsx");

    expect(workspace).toContain('useState<InboxLayout>("list")');
    expect(workspace).toContain("Liste");
    expect(workspace).toContain("Kanban");
    expect(workspace).toContain("La vue Kanban est en consultation uniquement.");
    expect(workspace).toContain("<AgentTicketTable");
    expect(workspace).toContain("<AgentTicketKanban");
  });

  it("uses stable workflow lane ids and a centralized status mapping", () => {
    const config = source("lib/ticket-kanban.ts");

    expect(config).toContain('"qualification"');
    expect(config).toContain('"assignment"');
    expect(config).toContain('"in-progress"');
    expect(config).toContain('"blocked"');
    expect(config).toContain('"confirmation"');
    expect(config).toContain('statuses: ["NEW", "TO_QUALIFY"]');
    expect(config).toContain('statuses: ["ASSIGNED", "IN_PROGRESS", "REOPENED"]');
    expect(config).toContain('statuses: ["RESOLUTION_PENDING"]');
    expect(config).toContain("getTicketKanbanColumnId");
  });

  it("renders read-only cards with stable ticket and lane metadata for future drag and drop", () => {
    const kanban = source("components/inbox/agent-ticket-kanban.tsx");

    expect(kanban).toContain("data-ticket-id={ticket.id}");
    expect(kanban).toContain("data-ticket-status={ticket.status}");
    expect(kanban).toContain("data-kanban-column={columnId}");
    expect(kanban).toContain("data-kanban-dropzone={column.id}");
    expect(kanban).toContain("draggable={false}");
    expect(kanban).not.toContain("onDragStart");
    expect(kanban).not.toContain("onDrop");
  });

  it("integrates the switchable workspace into the existing filtered inbox", () => {
    const inbox = source("app/(app)/inbox/page.tsx");

    expect(inbox).toContain('import { AgentTicketWorkspaceView }');
    expect(inbox).toContain("<TicketFilters");
    expect(inbox).toContain("<AgentTicketWorkspaceView tickets={currentRows} claimableTicketIds={claimableTicketIds} />");
    expect(inbox).toContain("<TicketCursorPagination");
  });

  it("keeps the Kanban horizontally usable on desktop and mobile", () => {
    const css = source("styles/legacy-bridge.css");

    expect(css).toContain(".agent-kanban-board");
    expect(css).toContain("grid-template-columns: repeat(5");
    expect(css).toContain("grid-auto-flow: column");
    expect(css).toContain("scroll-snap-type: x proximity");
  });
});
