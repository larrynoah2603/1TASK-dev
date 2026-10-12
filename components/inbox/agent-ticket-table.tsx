"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
import { ClaimTicketButton } from "@/components/claim-ticket-button";

const formatActivity = (value: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

function ExpandedTicketDetails({
  ticket,
  claimable,
  onReduce,
}: {
  ticket: DashboardTicketRow;
  claimable: boolean;
  onReduce: () => void;
}) {
  return (
    <section
      className="border-y border-[var(--kit-border)] px-4 py-4"
      aria-label={`Détails rapides de ${ticket.reference}`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Détails rapides</p>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-[var(--kit-text)]">
            {ticket.reference} · {ticket.title}
          </h3>

          <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--kit-text-2)]">Demandeur</dt>
              <dd className="mt-1 text-xs font-medium text-[var(--kit-text)]">{ticket.requester.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--kit-text-2)]">Département</dt>
              <dd className="mt-1 text-xs font-medium text-[var(--kit-text)]">{ticket.queue.department.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--kit-text-2)]">File</dt>
              <dd className="mt-1 text-xs font-medium text-[var(--kit-text)]">{ticket.queue.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--kit-text-2)]">Service</dt>
              <dd className="mt-1 text-xs font-medium text-[var(--kit-text)]">{ticket.serviceCatalogItem?.name ?? "Non renseigné"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--kit-text-2)]">Assigné</dt>
              <dd className="mt-1 text-xs font-medium text-[var(--kit-text)]">{ticket.assignedTo?.name ?? "Non affecté"}</dd>
            </div>
          </dl>

          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--kit-text-2)]">
            <span className="font-semibold">SLA</span>
            <SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {claimable ? <ClaimTicketButton ticketId={ticket.id} /> : null}
          <Link href={`/tickets/${ticket.id}` as Route} className="button-secondary">
            Ouvrir le ticket
          </Link>
          <button
            type="button"
            className="button-ghost min-h-10 text-xs"
            onClick={onReduce}
          >
            Réduire
          </button>
        </div>
      </div>
    </section>
  );
}

export function AgentTicketTable({
  tickets,
  claimableTicketIds,
}: {
  tickets: DashboardTicketRow[];
  claimableTicketIds: string[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const claimableTicketIdSet = new Set(claimableTicketIds);

  const toggleTicket = (ticketId: string) => {
    setExpandedId((current) => current === ticketId ? null : ticketId);
  };

  return (
    <div className="agent-ticket-workspace">
      <div className="agent-ticket-table-view agent-table-wrap">
        <div className="ui-data-table">
          <div className="ui-data-table-scroll">
            <table className="agent-ticket-responsive-table">
              <caption className="ui-sr-only">Mes tickets agent</caption>
              <thead>
                <tr>
                  <th className="agent-ticket-col-wide" scope="col">Référence</th>
                  <th className="agent-ticket-col-wide" scope="col">Sujet</th>
                  <th className="agent-ticket-col-wide" scope="col">Priorité</th>
                  <th className="agent-ticket-col-wide" scope="col">Statut</th>
                  <th className="agent-ticket-col-wide" scope="col">Demandeur</th>
                  <th className="agent-ticket-col-wide" scope="col">SLA</th>
                  <th className="agent-ticket-col-wide" scope="col">Dernière activité</th>

                  <th className="agent-ticket-col-condensed agent-ticket-col-ticket" scope="col">Ticket</th>
                  <th className="agent-ticket-col-condensed agent-ticket-col-treatment" scope="col">Traitement</th>
                  <th className="agent-ticket-col-condensed agent-ticket-col-sla" scope="col">SLA</th>
                  <th className="agent-ticket-col-condensed agent-ticket-col-activity" scope="col">Activité</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length ? tickets.map((ticket) => {
                  const expanded = expandedId === ticket.id;
                  const claimable = claimableTicketIdSet.has(ticket.id);

                  return (
                    <Fragment key={ticket.id}>
                      <tr
                        tabIndex={0}
                        aria-expanded={expanded}
                        aria-label={expanded
                          ? `${ticket.reference} ${ticket.title}, détails affichés`
                          : `${ticket.reference} ${ticket.title}, afficher les détails`}
                        className={`agent-ticket-row ${expanded ? "is-expanded" : ""}`}
                        onClick={() => toggleTicket(ticket.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleTicket(ticket.id);
                          }
                        }}
                      >
                        <td className="agent-ticket-col-wide"><span className="agent-ticket-reference">{ticket.reference}</span></td>
                        <td className="agent-ticket-col-wide"><span className="agent-ticket-title">{ticket.title}</span></td>
                        <td className="agent-ticket-col-wide"><PriorityBadge priority={ticket.priority} /></td>
                        <td className="agent-ticket-col-wide"><StatusBadge status={ticket.status} /></td>
                        <td className="agent-ticket-col-wide">{ticket.requester.name}</td>
                        <td className="agent-ticket-col-wide"><SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact /></td>
                        <td className="agent-ticket-col-wide">{formatActivity(ticket.updatedAt)}</td>

                        <td className="agent-ticket-col-condensed agent-ticket-col-ticket">
                          <div className="agent-ticket-cell-stack">
                            <span className="agent-ticket-reference">{ticket.reference}</span>
                            <span className="agent-ticket-title">{ticket.title}</span>
                            <small>{ticket.requester.name} · {ticket.queue.name}</small>
                          </div>
                        </td>
                        <td className="agent-ticket-col-condensed agent-ticket-col-treatment">
                          <div className="agent-ticket-cell-stack">
                            <StatusBadge status={ticket.status} />
                            <PriorityBadge priority={ticket.priority} />
                            <small>{ticket.assignedTo?.name ?? "Non affecté"}</small>
                          </div>
                        </td>
                        <td className="agent-ticket-col-condensed agent-ticket-col-sla">
                          <SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact />
                        </td>
                        <td className="agent-ticket-col-condensed agent-ticket-col-activity">{formatActivity(ticket.updatedAt)}</td>
                      </tr>

                      {expanded ? (
                        <tr className="agent-ticket-expanded-row">
                          <td colSpan={7} className="agent-ticket-col-wide p-0">
                            <ExpandedTicketDetails ticket={ticket} claimable={claimable} onReduce={() => toggleTicket(ticket.id)} />
                          </td>
                          <td colSpan={4} className="agent-ticket-col-condensed p-0">
                            <ExpandedTicketDetails ticket={ticket} claimable={claimable} onReduce={() => toggleTicket(ticket.id)} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                }) : (
                  <tr>
                    <td colSpan={11}>
                      <div className="ui-data-table-empty inbox-ticket-empty"><strong>Aucun ticket dans cette vue</strong><span>Modifiez la recherche ou les filtres pour élargir les résultats.</span></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="agent-ticket-mobile-list">
        {tickets.length ? tickets.map((ticket) => {
          const claimable = claimableTicketIdSet.has(ticket.id);
          return (
            <article key={ticket.id} className="agent-ticket-mobile-card">
              <div className="agent-ticket-mobile-topline">
                <span className="agent-ticket-reference">{ticket.reference}</span>
                <SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact />
              </div>

              <h3>{ticket.title}</h3>
              <p>{ticket.requester.name} · {ticket.queue.name}</p>

              <div className="agent-ticket-mobile-badges">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>

              <dl>
                <div>
                  <dt>Assigné</dt>
                  <dd>{ticket.assignedTo?.name ?? "Non affecté"}</dd>
                </div>
                <div>
                  <dt>Dernière activité</dt>
                  <dd>{formatActivity(ticket.updatedAt)}</dd>
                </div>
              </dl>

              <div className="agent-ticket-mobile-actions">
                {claimable ? <ClaimTicketButton ticketId={ticket.id} /> : null}
                <Link href={`/tickets/${ticket.id}` as Route} className="button-secondary">
                  Ouvrir
                </Link>
              </div>
            </article>
          );
        }) : (
          <div className="ui-data-table-empty inbox-ticket-empty"><strong>Aucun ticket dans cette vue</strong><span>Modifiez la recherche ou les filtres pour élargir les résultats.</span></div>
        )}
      </div>
    </div>
  );
}
