import Link from "next/link";
import type { Route } from "next";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
import { TICKET_KANBAN_COLUMNS, getTicketKanbanColumnId } from "@/lib/ticket-kanban";

const formatActivity = (value: Date) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(value);

function TicketKanbanCard({
  ticket,
  columnId,
}: {
  ticket: DashboardTicketRow;
  columnId: string;
}) {
  return (
    <article
      className="agent-kanban-card"
      data-ticket-id={ticket.id}
      data-ticket-status={ticket.status}
      data-kanban-column={columnId}
    >
      <Link
        href={`/tickets/${ticket.id}` as Route}
        className="agent-kanban-card-link"
        draggable={false}
        aria-label={`Ouvrir ${ticket.reference} : ${ticket.title}`}
      >
        <div className="agent-kanban-card-topline">
          <strong>{ticket.reference}</strong>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <h3>{ticket.title}</h3>
        <div className="agent-kanban-card-badges">
          <StatusBadge status={ticket.status} />
          <SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact />
        </div>
        <dl className="agent-kanban-card-meta">
          <div>
            <dt>File</dt>
            <dd>{ticket.queue.name}</dd>
          </div>
          <div>
            <dt>Assigné</dt>
            <dd>{ticket.assignedTo?.name ?? "Non affecté"}</dd>
          </div>
          <div>
            <dt>Demandeur</dt>
            <dd>{ticket.requester.name}</dd>
          </div>
          <div>
            <dt>Activité</dt>
            <dd>{formatActivity(ticket.updatedAt)}</dd>
          </div>
        </dl>
      </Link>
    </article>
  );
}

export function AgentTicketKanban({ tickets }: { tickets: DashboardTicketRow[] }) {
  const ticketsByColumn = new Map(
    TICKET_KANBAN_COLUMNS.map((column) => [
      column.id,
      tickets.filter((ticket) => getTicketKanbanColumnId(ticket.status) === column.id),
    ]),
  );
  const unmappedTickets = tickets.filter((ticket) => getTicketKanbanColumnId(ticket.status) === null);

  if (!tickets.length) {
    return <div className="agent-kanban-empty">Aucun ticket actif pour ces critères.</div>;
  }

  return (
    <div className="agent-kanban" aria-label="Vue Kanban des tickets actifs">
      <div className="agent-kanban-board">
        {TICKET_KANBAN_COLUMNS.map((column) => {
          const columnTickets = ticketsByColumn.get(column.id) ?? [];
          return (
            <section
              key={column.id}
              className="agent-kanban-column"
              data-kanban-column={column.id}
              aria-labelledby={`agent-kanban-${column.id}`}
            >
              <header className="agent-kanban-column-header">
                <div>
                  <h3 id={`agent-kanban-${column.id}`}>{column.label}</h3>
                  <p>{column.description}</p>
                </div>
                <span aria-label={`${columnTickets.length} ticket${columnTickets.length === 1 ? "" : "s"}`}>
                  {columnTickets.length}
                </span>
              </header>
              <div className="agent-kanban-dropzone" data-kanban-dropzone={column.id}>
                {columnTickets.length ? (
                  <ul className="agent-kanban-list">
                    {columnTickets.map((ticket) => (
                      <li key={ticket.id}>
                        <TicketKanbanCard ticket={ticket} columnId={column.id} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="agent-kanban-column-empty">Aucun ticket</p>
                )}
              </div>
            </section>
          );
        })}

        {unmappedTickets.length ? (
          <section className="agent-kanban-column" data-kanban-column="unmapped" aria-labelledby="agent-kanban-unmapped">
            <header className="agent-kanban-column-header">
              <div>
                <h3 id="agent-kanban-unmapped">Autres</h3>
                <p>Statuts actifs non encore rattachés à une colonne.</p>
              </div>
              <span>{unmappedTickets.length}</span>
            </header>
            <div className="agent-kanban-dropzone">
              <ul className="agent-kanban-list">
                {unmappedTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <TicketKanbanCard ticket={ticket} columnId="unmapped" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
