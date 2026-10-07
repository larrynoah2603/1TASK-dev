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

export function AgentTicketTable({
  tickets,
  claimableTicketIds,
}: {
  tickets: DashboardTicketRow[];
  claimableTicketIds: string[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleTicket = (ticketId: string) => {
    setExpandedId((current) => current === ticketId ? null : ticketId);
  };

  return (
    <div className="agent-ticket-workspace">
      <div className="agent-table-wrap">
        <div className="ui-data-table">
          <div className="ui-data-table-scroll">
            <table>
              <caption className="ui-sr-only">Mes tickets agent</caption>
              <thead>
                <tr>
                  <th scope="col">Référence</th>
                  <th scope="col">Sujet</th>
                  <th scope="col">Priorité</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Client</th>
                  <th scope="col">SLA</th>
                  <th scope="col">Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length ? tickets.map((ticket) => {
                  const expanded = expandedId === ticket.id;
                  const claimable = claimableTicketIds.includes(ticket.id);

                  return (
                    <Fragment key={ticket.id}>
                      <tr
                        tabIndex={0}
                        aria-expanded={expanded}
                        aria-label={expanded
                          ? `${ticket.reference} ${ticket.title}, détails affichés`
                          : `${ticket.reference} ${ticket.title}, afficher les détails`}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 ${expanded ? "bg-slate-50" : ""}`}
                        onClick={() => toggleTicket(ticket.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleTicket(ticket.id);
                          }
                        }}
                      >
                        <td><span className="agent-ticket-reference">{ticket.reference}</span></td>
                        <td><span className="agent-ticket-title">{ticket.title}</span></td>
                        <td><PriorityBadge priority={ticket.priority} /></td>
                        <td><StatusBadge status={ticket.status} /></td>
                        <td>{ticket.requester.name}</td>
                        <td><SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact /></td>
                        <td>{formatActivity(ticket.updatedAt)}</td>
                      </tr>

                      {expanded ? (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="p-0">
                            <section
                              className="border-y border-slate-200 px-4 py-4"
                              aria-label={`Détails rapides de ${ticket.reference}`}
                            >
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="eyebrow">Détails rapides</p>
                                    <PriorityBadge priority={ticket.priority} />
                                    <StatusBadge status={ticket.status} />
                                  </div>
                                  <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">
                                    {ticket.reference} · {ticket.title}
                                  </h3>

                                  <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                    <div>
                                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Client</dt>
                                      <dd className="mt-1 text-xs font-medium text-slate-700">{ticket.requester.name}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Département</dt>
                                      <dd className="mt-1 text-xs font-medium text-slate-700">{ticket.queue.department.name}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">File</dt>
                                      <dd className="mt-1 text-xs font-medium text-slate-700">{ticket.queue.name}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Service</dt>
                                      <dd className="mt-1 text-xs font-medium text-slate-700">{ticket.serviceCatalogItem?.name ?? "Non renseigné"}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Assigné</dt>
                                      <dd className="mt-1 text-xs font-medium text-slate-700">{ticket.assignedTo?.name ?? "Non affecté"}</dd>
                                    </div>
                                  </dl>

                                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
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
                                    onClick={() => setExpandedId(null)}
                                  >
                                    Réduire
                                  </button>
                                </div>
                              </div>
                            </section>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                }) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="ui-data-table-empty">Aucun ticket actif pour ces critères.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
