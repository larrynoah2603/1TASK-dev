import type { TicketStatus } from "@prisma/client";

export type TicketKanbanColumnId =
  | "qualification"
  | "assignment"
  | "in-progress"
  | "blocked"
  | "confirmation";

export type TicketKanbanColumn = {
  id: TicketKanbanColumnId;
  label: string;
  description: string;
  statuses: readonly TicketStatus[];
};

/**
 * Presentation-only workflow lanes for the operational inbox.
 *
 * The stable lane IDs and centralized status mapping are deliberate: a future
 * drag-and-drop adapter can target these IDs without deriving workflow state
 * from labels or DOM position. Actual ticket transitions must still be
 * validated by the existing server-side workflow rules.
 */
export const TICKET_KANBAN_COLUMNS: readonly TicketKanbanColumn[] = [
  {
    id: "qualification",
    label: "À qualifier",
    description: "Nouvelles demandes à comprendre et qualifier.",
    statuses: ["NEW", "TO_QUALIFY"],
  },
  {
    id: "assignment",
    label: "À affecter",
    description: "Tickets qualifiés qui attendent une affectation.",
    statuses: ["TO_ASSIGN"],
  },
  {
    id: "in-progress",
    label: "En cours",
    description: "Tickets affectés ou activement pris en charge.",
    statuses: ["ASSIGNED", "IN_PROGRESS", "REOPENED"],
  },
  {
    id: "blocked",
    label: "Bloqués",
    description: "Tickets en attente d'un élément avant reprise.",
    statuses: ["BLOCKED"],
  },
  {
    id: "confirmation",
    label: "À confirmer",
    description: "Résolution proposée, en attente de confirmation.",
    statuses: ["RESOLUTION_PENDING"],
  },
];

export function getTicketKanbanColumnId(status: TicketStatus): TicketKanbanColumnId | null {
  return TICKET_KANBAN_COLUMNS.find((column) => column.statuses.includes(status))?.id ?? null;
}
