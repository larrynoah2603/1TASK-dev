import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { RoleCode, TicketEventType } from "@prisma/client";
import { TicketActions } from "@/components/ticket-actions";
import { TicketAdvancedPanels } from "@/components/ticket-advanced-panels";
import { TicketCommentThread } from "@/components/ticket-comment-thread";
import { TicketStatusStrip } from "@/components/ticket-status-strip";
import { BLOCK_REASON_LABELS, TYPE_LABELS } from "@/lib/domain";
import { DomainError } from "@/lib/domain-error";
import { getTicketSlaState } from "@/lib/sla";
import { getTicketActionContext } from "@/lib/ticket-service";
import { getTicketForViewer } from "@/lib/ticket-detail-service";
import { AuthorizationError, getSessionUserContext, roleCodes } from "@/lib/server-auth";
import { TicketHeader } from "@/components/tickets/detail/ticket-header";
import { TicketConversation } from "@/components/tickets/detail/ticket-conversation";
import { TicketPanel } from "@/components/tickets/detail/ticket-panel";
import { TicketSidebarActions } from "@/components/tickets/detail/ticket-sidebar-actions";
import { TicketWorkspaceTabs } from "@/components/tickets/detail/ticket-workspace-tabs";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { formatRelativeActivityDate } from "@/components/activity-icon";
import { getProductCapabilities } from "@/lib/product-policy.server";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

const eventLabels: Record<string, string> = {
  CREATED: "Ticket créé",
  STATUS_CHANGED: "Statut modifié",
  ASSIGNED: "Ticket affecté",
  QUEUE_CHANGED: "File opérationnelle modifiée",
  MESSAGE_ADDED: "Commentaire ajouté",
  RESOLUTION_SUBMITTED: "Résolution soumise",
  REOPENED: "Ticket réouvert",
  CLOSED: "Ticket clôturé",
  CANCELLED: "Ticket annulé",
  SLA_ALERT: "Alerte SLA",
  SLA_BREACH: "Dépassement SLA",
  CONFIDENTIAL_ACCESS_GRANTED: "Accès confidentiel accordé",
  CONFIDENTIAL_ACCESS_REVOKED: "Accès confidentiel retiré",
  QUALIFIED: "Qualification enregistrée",
  LINK_CREATED: "Lien entre tickets créé",
  SLA_EXCEPTION_CREATED: "Dérogation SLA enregistrée",
};

type Tone = NonNullable<TimelineItem["tone"]>;

/** Présentation uniquement : icône et couleur de chaque type d'événement. */
const eventTone: Record<string, Tone> = {
  RESOLUTION_SUBMITTED: "success",
  CLOSED: "success",
  CANCELLED: "warning",
  REOPENED: "warning",
  SLA_ALERT: "warning",
  SLA_BREACH: "danger",
  CONFIDENTIAL_ACCESS_GRANTED: "warning",
};

function formatDate(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "Non configurée";
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
  const capabilities = getProductCapabilities();
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
  const v1Profile = !capabilities.workflowDefinitions;
  const requesterView = user.id === ticket.requesterId;
  const v1RequesterView = v1Profile && requesterView;
  const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];
  const operational = !v1RequesterView && roleCodes(user).some((role) => operationalRoles.includes(role));
  const sla = getTicketSlaState(ticket);

  // L'onglet Historique reste centré sur les événements structurants.
  // Les messages restent dans Échanges pour éviter de les lire deux fois.
  const timeline = [
    ...ticket.events
      .filter((event) =>
        event.eventType !== TicketEventType.ASSIGNED &&
        event.eventType !== TicketEventType.MESSAGE_ADDED,
      )
      .map((event) => ({ kind: "event" as const, at: event.createdAt, event })),
    ...ticket.assignments.map((assignment) => ({ kind: "assignment" as const, at: assignment.assignedAt, assignment })),
  ].sort((left, right) => left.at.getTime() - right.at.getTime());

  const canResolve = actionContext.allowedStatuses.some((status) => String(status) === "RESOLUTION_PENDING");
  const hasTreatmentActions =
    actionContext.canClaim ||
    actionContext.canAssign ||
    actionContext.canTransfer ||
    actionContext.allowedStatuses.length > 0;

  const timelineItems: TimelineItem[] = timeline.map((item) => {
    if (item.kind === "event") {
      const mode = assignmentMode(item.event.metadata);
      return {
        title: eventLabels[item.event.eventType] ?? item.event.eventType.replaceAll("_", " "),
        actor: item.event.actor?.name ?? "Système",
        meta: formatRelativeActivityDate(item.event.createdAt),
        description: mode ? `Mode d’affectation : ${mode}` : undefined,
        type: item.event.eventType,
        tone: eventTone[item.event.eventType] ?? "info",
      };
    }
    return {
      title: `Affectation : ${item.assignment.previousAssignee?.name ?? "Non affecté"} → ${item.assignment.newAssignee?.name ?? "Non affecté"}`,
      actor: item.assignment.assignedBy?.name ?? "Système",
      meta: formatRelativeActivityDate(item.assignment.assignedAt),
      type: "ASSIGNED",
      tone: "info" as Tone,
    };
  });

  const advancedPanelProps = {
    ticketId: ticket.id,
    targetDepartmentId: ticket.queue.department.id,
    impact: ticket.impact,
    urgency: ticket.urgency,
    priority: ticket.priority,
    legalDueAt: ticket.legalDueAt?.toISOString() ?? null,
    firstResponseDueAt: ticket.firstResponseDueAt?.toISOString() ?? null,
    resolutionDueAt: ticket.resolutionDueAt?.toISOString() ?? null,
    canQualify: operational && ticket.status !== "CLOSED" && ticket.status !== "CANCELLED",
    canManageSla: actionContext.canTransfer && ticket.status !== "CLOSED" && ticket.status !== "CANCELLED",
    canUpload: capabilities.attachmentUploads && actionContext.canPostPublic,
    canLink: operational && ticket.status !== "CLOSED" && ticket.status !== "CANCELLED",
  };

  return (
    <div className="kit-ticket ticket-detail-industrial ticket-detail-workspace-page">
      <Link href={operational ? "/inbox" : "/tickets"} className="kit-back">
        <Icon name="arrowLeft" />
        {operational ? "Retour à la boîte agent" : "Retour à mes tickets"}
      </Link>

      <TicketHeader>
        <div className="kit-ticket-idrow">
          <span className="kit-ref">{ticket.reference}</span>
          <span className="kit-badge kit-badge-neutral">{TYPE_LABELS[ticket.type]}</span>
        </div>
        <h1 className="kit-ticket-title">{ticket.title}</h1>
        <p className="kit-ticket-route">
          {ticket.serviceCatalogItem.name} · {ticket.queue.department.name} / {ticket.queue.name}
          {ticket.assignedTo ? ` · ${ticket.assignedTo.name}` : " · Non affecté"}
        </p>
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
          simplifiedV1={v1Profile}
        />
      </TicketHeader>

      {ticket.status === "BLOCKED" ? (
        <section className="ticket-attention-banner ticket-attention-warning" role="status">
          <div>
            <strong>Traitement en attente</strong>
            <p>
              {ticket.blockReason ? BLOCK_REASON_LABELS[ticket.blockReason] : "Le traitement est temporairement bloqué."}
              {ticket.blockDetails ? ` · ${ticket.blockDetails}` : ""}
            </p>
          </div>
        </section>
      ) : null}

      {ticket.status === "RESOLUTION_PENDING" ? (
        <section className="ticket-attention-banner ticket-attention-success" role="status">
          <div>
            <strong>Résolution proposée</strong>
            <p>
              Le demandeur peut confirmer la résolution ou signaler que le problème persiste.
              {ticket.autoClosureDueAt ? ` Clôture automatique prévue le ${formatDate(ticket.autoClosureDueAt)}.` : ""}
            </p>
          </div>
        </section>
      ) : null}

      {ticket.status === "CANCELLED" ? (
        <section className="ticket-attention-banner ticket-attention-neutral" role="status">
          <div>
            <strong>Demande annulée</strong>
            <p>{ticket.cancellationReason ?? "Le ticket est conservé en lecture seule dans l’historique."}</p>
          </div>
        </section>
      ) : null}

      <div className="ticket-detail-workspace">
        <aside className="ticket-treatment-rail" aria-label="Traitement et informations du ticket">
          <div className="ticket-treatment-sticky">
            <section className="ticket-treatment-section">
              <div className="ticket-treatment-heading">
                <p className="eyebrow">Traitement</p>
                <h2>{hasTreatmentActions ? (requesterView ? "Suivi de votre demande" : "Prochaine action") : "Ticket en lecture seule"}</h2>
                <p>
                  {hasTreatmentActions
                    ? (requesterView ? "Confirmez la résolution ou poursuivez l’échange avec le support." : "Les actions disponibles dépendent de votre rôle et de l’état actuel.")
                    : "Aucune action de workflow n’est disponible dans l’état actuel."}
                </p>
              </div>
              {hasTreatmentActions ? (
                <TicketSidebarActions>
                  <TicketActions
                    ticketId={ticket.id}
                    status={ticket.status}
                    simplifiedV1={v1Profile}
                    requesterView={requesterView}
                    workspaceMode
                    {...actionContext}
                  />
                </TicketSidebarActions>
              ) : null}
            </section>

            <TicketPanel title="Informations" subtitle="Contexte opérationnel">
              <div className="ticket-operational-summary">
                <div className="ticket-operational-person">
                  <Avatar name={ticket.requester.name} size="md" />
                  <div>
                    <span>Demandeur</span>
                    <strong>{ticket.requester.name}</strong>
                    <small>{ticket.sourceDepartment?.name ?? "Département non renseigné"}</small>
                  </div>
                </div>

                <dl className="kit-dl ticket-operational-dl">
                  <div><dt>Agent</dt><dd>{ticket.assignedTo?.name ?? "Non affecté"}</dd></div>
                  <div><dt>Département</dt><dd>{ticket.queue.department.name}</dd></div>
                  <div><dt>File</dt><dd>{ticket.queue.name}</dd></div>
                  <div><dt>Service</dt><dd>{ticket.serviceCatalogItem.name}</dd></div>
                  <div><dt>Responsable</dt><dd>{ticket.queue.manager?.name ?? "Non désigné"}</dd></div>
                  <div><dt>Créé le</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
                  <div><dt>Première réponse</dt><dd>{formatDate(ticket.firstResponseDueAt)}</dd></div>
                  <div><dt>Résolution</dt><dd>{formatDate(ticket.resolutionDueAt)}</dd></div>
                  <div><dt>Temps bloqué</dt><dd>{ticket.totalPausedMinutes} min</dd></div>
                </dl>

                {ticket.dossier || ticket.mission ? (
                  <div className="ticket-production-summary">
                    <p className="ticket-summary-label">Contexte de production</p>
                    <dl className="kit-dl">
                      <div><dt>Client</dt><dd>{ticket.dossier?.client.name ?? "Non renseigné"}</dd></div>
                      <div><dt>Dossier</dt><dd>{ticket.dossier ? <Link href={`/dossiers/${ticket.dossier.id}` as Route}>{ticket.dossier.code}</Link> : "Non rattaché"}</dd></div>
                      <div><dt>Mission</dt><dd>{ticket.mission ? <Link href={`/missions/${ticket.mission.id}` as Route}>{ticket.mission.code}</Link> : "Non rattachée"}</dd></div>
                      <div><dt>Budget mission</dt><dd>{ticket.mission?.budgetMinutes ? formatMinutes(ticket.mission.budgetMinutes) : "Non défini"}</dd></div>
                      <div><dt>Temps mission</dt><dd>{formatMinutes(ticket.missionWorklogMinutes)}</dd></div>
                      <div><dt>Temps ticket</dt><dd>{formatMinutes(ticket.worklogSummary.minutes)} · {ticket.worklogSummary.entries} saisie(s)</dd></div>
                    </dl>
                  </div>
                ) : null}
              </div>
            </TicketPanel>
          </div>

          <section className="ticket-advanced-tools" aria-label={operational ? "Outils avancés" : "Relations du ticket"}>
            <div className="ticket-advanced-tools-heading">
              <p className="eyebrow">{operational ? "Outils avancés" : "Relations"}</p>
              <p>
                {operational
                  ? "Qualification, SLA et relations restent disponibles sans encombrer l’action principale."
                  : "Consultez les tickets liés qui restent dans votre périmètre de visibilité."}
              </p>
            </div>
            <TicketAdvancedPanels only="management" compact {...advancedPanelProps} />
          </section>
        </aside>

        <main className="ticket-detail-main">
          <TicketPanel title="Demande" subtitle="Besoin et description initiale">
            {ticket.requestedService ? (
              <div className="kit-need">
                <p className="kit-need-label">Besoin saisi par le demandeur</p>
                <p className="kit-need-value">{ticket.requestedService}</p>
              </div>
            ) : null}
            <p className="kit-prose">{ticket.description}</p>
          </TicketPanel>

          <TicketWorkspaceTabs
            messageCount={ticket.messages.length}
            historyCount={timeline.length}
            conversation={
              <TicketConversation>
                <TicketCommentThread
                  ticketId={ticket.id}
                  messages={ticket.messages}
                  canPostPublic={actionContext.canPostPublic}
                  canPostInternal={actionContext.canPostInternal}
                />
              </TicketConversation>
            }
            history={
              <section className="ticket-history-pane" aria-label="Historique du ticket">
                <div className="ticket-section-heading">
                  <div>
                    <h2>Historique</h2>
                    <p>Événements de workflow et affectations. Les messages restent dans l’onglet Échanges.</p>
                  </div>
                  <span className="ticket-section-count">{timeline.length}</span>
                </div>
                <div className="ticket-history-body">
                  {timelineItems.length ? <Timeline items={timelineItems} /> : <p className="kit-empty">Aucun événement enregistré.</p>}
                </div>
              </section>
            }
            attachments={<TicketAdvancedPanels only="attachments" embedded {...advancedPanelProps} />}
          />
        </main>
      </div>
    </div>
  );
}
