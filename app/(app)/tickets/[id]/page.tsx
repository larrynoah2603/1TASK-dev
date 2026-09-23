import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { TicketActions } from "@/components/ticket-actions";
import { TicketAdvancedPanels } from "@/components/ticket-advanced-panels";
import { TicketCommentThread } from "@/components/ticket-comment-thread";
import { TicketSidePanel } from "@/components/ticket-side-panel";
import { TicketStatusStrip } from "@/components/ticket-status-strip";
import { BLOCK_REASON_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/domain";
import { DomainError } from "@/lib/domain-error";
import { getTicketSlaState } from "@/lib/sla";
import { getTicketActionContext } from "@/lib/ticket-service";
import { getTicketForViewer } from "@/lib/ticket-detail-service";
import { AuthorizationError, getSessionUserContext, roleCodes } from "@/lib/server-auth";
import { TicketWorkspace, TicketWorkspaceHeader } from "@/components/tickets/ticket-workspace";
import { TicketSlaPanel } from "@/components/tickets/ticket-sla-panel";

const eventLabels: Record<string, string> = {
  CREATED: "Ticket créé",
  STATUS_CHANGED: "Statut modifié",
  ASSIGNED: "Ticket affecté",
  QUEUE_CHANGED: "File opérationnelle modifiée",
  MESSAGE_ADDED: "Commentaire ajouté",
  RESOLUTION_SUBMITTED: "Résolution soumise",
  REOPENED: "Ticket réouvert",
  CLOSED: "Ticket clôturé",
  SLA_ALERT: "Alerte SLA",
  SLA_BREACH: "Dépassement SLA",
  CONFIDENTIAL_ACCESS_GRANTED: "Accès confidentiel accordé",
  CONFIDENTIAL_ACCESS_REVOKED: "Accès confidentiel retiré",
  QUALIFIED: "Qualification enregistrée",
  LINK_CREATED: "Lien entre tickets créé",
  SLA_EXCEPTION_CREATED: "Dérogation SLA enregistrée",
};

function formatDate(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Non configurée";
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours} h ${remaining.toString().padStart(2, "0")}` : `${remaining} min`;
}

function assignmentMode(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("assignmentMode" in metadata)) return null;
  const value = (metadata as { assignmentMode?: unknown }).assignmentMode;
  return typeof value === "string" ? value : null;
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUserContext();
  if (!user) return null;
  const { id: ticketId } = await params;

  let ticket;
  try {
    ticket = await getTicketForViewer(user, ticketId);
  } catch (error) {
    if (
      (error instanceof DomainError && error.statusCode === 404) ||
      error instanceof AuthorizationError
    ) {
      notFound();
    }
    throw error;
  }
  if (!ticket) notFound();

  const actionContext = await getTicketActionContext(user, ticket);
  const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];
  const operational = roleCodes(user).some((role) => operationalRoles.includes(role));
  const sla = getTicketSlaState(ticket);
  const timeline = [
    ...ticket.events.map((event) => ({ kind: "event" as const, at: event.createdAt, event })),
    ...ticket.assignments.map((assignment) => ({ kind: "assignment" as const, at: assignment.assignedAt, assignment })),
    ...ticket.messages.map((message) => ({ kind: "message" as const, at: message.createdAt, message })),
  ].sort((left, right) => left.at.getTime() - right.at.getTime());
  const canResolve = actionContext.allowedStatuses.some((status) => String(status) === "RESOLUTION_PENDING");

  return (
    <TicketWorkspace className="ticket-detail-industrial">
      <Link href={operational ? "/inbox" : "/tickets"} className="ticket-back-link">
        ← {operational ? "Retour à la boîte agent" : "Retour à mes tickets"}
      </Link>

      <TicketWorkspaceHeader><div className="ticket-detail-heading"><p className="eyebrow">{ticket.reference}</p><h1>{ticket.title}</h1><p>{ticket.queue.department.name} · {ticket.queue.name} · {ticket.serviceCatalogItem.name}</p></div><TicketSlaPanel state={sla.state} dueAt={sla.dueAt} createdAt={ticket.createdAt} pausedMinutes={ticket.totalPausedMinutes} /></TicketWorkspaceHeader>
      <header className="ticket-detail-header">
        <div className="ticket-detail-heading">
          <p className="eyebrow">{ticket.reference}</p>
          <h1>{ticket.title}</h1>
          <p>
            {ticket.sourceDepartment?.name ?? "Département source non renseigné"} → {ticket.queue.department.name} · {ticket.queue.name} · {ticket.serviceCatalogItem.name}
          </p>
        </div>
        <TicketStatusStrip
          reference={ticket.reference}
          status={ticket.status}
          priority={ticket.priority}
          slaState={sla.state}
          slaDueAt={sla.dueAt}
          createdAt={ticket.createdAt}
          pausedMinutes={ticket.totalPausedMinutes}
          canClaim={actionContext.canClaim}
          canResolve={canResolve}
        />
      </header>

      <div className="ticket-detail-layout">
        <main className="ticket-detail-main">
          <TicketCommentThread
            ticketId={ticket.id}
            messages={ticket.messages}
            canPostPublic={actionContext.canPostPublic}
            canPostInternal={actionContext.canPostInternal}
          />
        </main>

        <aside className="ticket-detail-sidebar" aria-label="Informations et actions du ticket">
          <TicketSidePanel title="Description" subtitle="Demande initiale" defaultOpen>
            <div className="ticket-side-panel-card">
              {ticket.requestedService ? <div className="mb-3 border-b border-slate-100 pb-3"><p className="eyebrow">Besoin saisi par le demandeur</p><p className="mt-1 text-sm font-semibold text-slate-800">{ticket.requestedService}</p></div> : null}
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.description}</p>
            </div>
          </TicketSidePanel>

          <TicketSidePanel title="Timeline" subtitle="Historique chronologique" count={timeline.length}>
            <div className="ticket-side-panel-card ticket-timeline-list">
              {timeline.map((item) => {
                if (item.kind === "event") {
                  const mode = assignmentMode(item.event.metadata);
                  return (
                    <div key={`event-${item.event.id}`} className="ticket-timeline-item">
                      <span className="ticket-timeline-dot" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{eventLabels[item.event.eventType] ?? item.event.eventType.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{item.event.actor?.name ?? "Système"} · {formatDate(item.event.createdAt)}</p>
                        {mode ? <p className="mt-1 text-xs text-slate-500">Mode d’affectation : {mode}</p> : null}
                      </div>
                    </div>
                  );
                }
                if (item.kind === "assignment") {
                  return (
                    <div key={`assignment-${item.assignment.id}`} className="ticket-timeline-assignment">
                      <p className="eyebrow">Historique d’affectation</p>
                      <p className="mt-2 text-sm text-slate-700">{item.assignment.previousAssignee?.name ?? "Non affecté"} → {item.assignment.newAssignee?.name ?? "Non affecté"}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Par {item.assignment.assignedBy?.name ?? "Système"} · {formatDate(item.assignment.assignedAt)}</p>
                    </div>
                  );
                }
                return (
                  <div key={`message-${item.message.id}`} className={`ticket-timeline-message${item.message.visibility === "INTERNAL" ? " ticket-timeline-message-internal" : ""}`}>
                    <div className="flex justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{item.message.author.name}</p><p className="text-[11px] font-semibold text-slate-500">{item.message.visibility === "INTERNAL" ? "Interne" : "Public"}</p></div>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDate(item.message.createdAt)}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message.body}</p>
                  </div>
                );
              })}
              {!timeline.length ? <p className="ticket-empty-state">Aucun événement enregistré.</p> : null}
            </div>
          </TicketSidePanel>

          <TicketSidePanel title="Récapitulatif" subtitle="Qui fait quoi et quand" defaultOpen>
            <div className="ticket-side-panel-card">
              <dl className="ticket-summary-list">
                <div><dt>Demandeur</dt><dd>{ticket.requester.name}</dd></div>
                <div><dt>Responsable de file</dt><dd>{ticket.queue.manager?.name ?? "Non désigné"}</dd></div>
                <div><dt>Agent</dt><dd>{ticket.assignedTo?.name ?? "Non affecté"}</dd></div>
                <div><dt>Nature</dt><dd>{TYPE_LABELS[ticket.type]}</dd></div>
                <div><dt>Créé le</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
                <div><dt>Première réponse avant</dt><dd>{formatDate(ticket.firstResponseDueAt)}</dd></div>
                <div><dt>Résolution avant</dt><dd>{formatDate(ticket.resolutionDueAt)}</dd></div>
                <div><dt>Temps bloqué</dt><dd>{ticket.totalPausedMinutes} min</dd></div>
                {ticket.blockReason ? <div><dt>Blocage</dt><dd>{BLOCK_REASON_LABELS[ticket.blockReason]}</dd></div> : null}
              </dl>
            </div>
          </TicketSidePanel>

          {ticket.dossier || ticket.mission ? (
            <TicketSidePanel title="Contexte de production" subtitle="Dossier, mission et temps">
              <div className="ticket-side-panel-card">
                <dl className="ticket-summary-list">
                  <div><dt>Client</dt><dd>{ticket.dossier?.client.name ?? "Non renseigné"}</dd></div>
                  <div><dt>Dossier</dt><dd>{ticket.dossier ? <Link href={`/dossiers/${ticket.dossier.id}` as Route}>{ticket.dossier.code}</Link> : "Non rattaché"}</dd></div>
                  <div><dt>Mission</dt><dd>{ticket.mission ? <Link href={`/missions/${ticket.mission.id}` as Route}>{ticket.mission.code}</Link> : "Non rattachée"}</dd></div>
                  <div><dt>Budget mission</dt><dd>{ticket.mission?.budgetMinutes ? formatMinutes(ticket.mission.budgetMinutes) : "Non défini"}</dd></div>
                  <div><dt>Temps mission</dt><dd>{formatMinutes(ticket.missionWorklogMinutes)}</dd></div>
                  <div><dt>Temps sur ticket</dt><dd>{formatMinutes(ticket.worklogSummary.minutes)} · {ticket.worklogSummary.entries} saisie(s)</dd></div>
                </dl>
              </div>
            </TicketSidePanel>
          ) : null}

          <TicketAdvancedPanels
            ticketId={ticket.id}
            impact={ticket.impact}
            urgency={ticket.urgency}
            priority={ticket.priority}
            legalDueAt={ticket.legalDueAt?.toISOString() ?? null}
            firstResponseDueAt={ticket.firstResponseDueAt?.toISOString() ?? null}
            resolutionDueAt={ticket.resolutionDueAt?.toISOString() ?? null}
            canQualify={operational && ticket.status !== "CLOSED"}
            canManageSla={actionContext.canTransfer && ticket.status !== "CLOSED"}
            canUpload={actionContext.canPostPublic}
            canLink={operational && ticket.status !== "CLOSED"}
          />
          <TicketActions ticketId={ticket.id} status={ticket.status} {...actionContext} />
        </aside>
      </div>
    </TicketWorkspace>
  );
}
