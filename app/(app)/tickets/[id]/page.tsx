import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { RoleCode } from "@prisma/client";
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
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icons";
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
const eventVisual: Record<string, { icon: IconName; tone: Tone }> = {
  CREATED: { icon: "plus", tone: "info" },
  STATUS_CHANGED: { icon: "refresh", tone: "info" },
  ASSIGNED: { icon: "userPlus", tone: "info" },
  QUEUE_CHANGED: { icon: "layers", tone: "info" },
  MESSAGE_ADDED: { icon: "message", tone: "neutral" },
  RESOLUTION_SUBMITTED: { icon: "checkCircle", tone: "success" },
  REOPENED: { icon: "refresh", tone: "warning" },
  CLOSED: { icon: "lock", tone: "neutral" },
  SLA_ALERT: { icon: "alertTriangle", tone: "warning" },
  SLA_BREACH: { icon: "alertCircle", tone: "danger" },
  CONFIDENTIAL_ACCESS_GRANTED: { icon: "shield", tone: "warning" },
  CONFIDENTIAL_ACCESS_REVOKED: { icon: "shield", tone: "neutral" },
  QUALIFIED: { icon: "tag", tone: "info" },
  LINK_CREATED: { icon: "link", tone: "info" },
  SLA_EXCEPTION_CREATED: { icon: "clock", tone: "warning" },
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

  const timelineItems: TimelineItem[] = timeline.map((item) => {
    if (item.kind === "event") {
      const mode = assignmentMode(item.event.metadata);
      const visual = eventVisual[item.event.eventType] ?? { icon: "clock" as IconName, tone: "neutral" as Tone };
      return {
        title: eventLabels[item.event.eventType] ?? item.event.eventType.replaceAll("_", " "),
        meta: `${item.event.actor?.name ?? "Système"} · ${formatDate(item.event.createdAt)}`,
        description: mode ? `Mode d’affectation : ${mode}` : undefined,
        icon: <Icon name={visual.icon} />,
        tone: visual.tone,
      };
    }
    if (item.kind === "assignment") {
      return {
        title: `Affectation : ${item.assignment.previousAssignee?.name ?? "Non affecté"} → ${item.assignment.newAssignee?.name ?? "Non affecté"}`,
        meta: `Par ${item.assignment.assignedBy?.name ?? "Système"} · ${formatDate(item.assignment.assignedAt)}`,
        icon: <Icon name="userPlus" />,
        tone: "info" as Tone,
      };
    }
    const internal = item.message.visibility === "INTERNAL";
    return {
      title: `${item.message.author.name} · ${internal ? "commentaire interne" : "commentaire public"}`,
      meta: formatDate(item.message.createdAt),
      description: item.message.body,
      icon: <Icon name="message" />,
      tone: (internal ? "warning" : "info") as Tone,
    };
  });

  return (
    <div className="kit-ticket ticket-detail-industrial">
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
          {ticket.sourceDepartment?.name ?? "Département source non renseigné"} → {ticket.queue.department.name} · {ticket.queue.name} · {ticket.serviceCatalogItem.name}
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
        />
      </TicketHeader>

      <div className="kit-ticket-grid">
        <div className="kit-ticket-col">
          <TicketPanel title="Description" subtitle="Demande initiale">
            {ticket.requestedService ? <div className="kit-need"><p className="kit-need-label">Besoin saisi par le demandeur</p><p className="kit-need-value">{ticket.requestedService}</p></div> : null}
            <p className="kit-prose">{ticket.description}</p>
          </TicketPanel>

          <TicketConversation>
            <TicketCommentThread
              ticketId={ticket.id}
              messages={ticket.messages}
              canPostPublic={actionContext.canPostPublic}
              canPostInternal={actionContext.canPostInternal}
            />
          </TicketConversation>

          <TicketPanel title="Chronologie" subtitle="Historique complet du ticket" count={timeline.length}>
            {timelineItems.length ? <Timeline items={timelineItems} /> : <p className="kit-empty">Aucun événement enregistré.</p>}
          </TicketPanel>

          <TicketAdvancedPanels
            only="attachments"
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
        </div>

        <aside className="kit-ticket-col kit-ticket-side" aria-label="Informations et actions du ticket">
          <TicketSidebarActions>
            <TicketActions ticketId={ticket.id} status={ticket.status} {...actionContext} />
          </TicketSidebarActions>

          <TicketPanel title="Demandeur">
            <div className="kit-person">
              <Avatar name={ticket.requester.name} size="lg" />
              <div>
                <p className="kit-person-name">{ticket.requester.name}</p>
                <p className="kit-person-role">{ticket.sourceDepartment?.name ?? "Département non renseigné"}</p>
              </div>
            </div>
          </TicketPanel>

          <TicketPanel title="Équipe en charge">
            {ticket.assignedTo ? (
              <div className="kit-person">
                <Avatar name={ticket.assignedTo.name} size="lg" />
                <div>
                  <p className="kit-person-name">{ticket.assignedTo.name}</p>
                  <p className="kit-person-role">Agent assigné</p>
                </div>
              </div>
            ) : <p className="kit-empty" style={{ padding: 0, textAlign: "left" }}>Aucun agent assigné pour le moment.</p>}
            <dl className="kit-dl" style={{ marginTop: "var(--kit-space-4)" }}>
              <div><dt>Département</dt><dd>{ticket.queue.department.name}</dd></div>
              <div><dt>File</dt><dd>{ticket.queue.name}</dd></div>
              <div><dt>Responsable de file</dt><dd>{ticket.queue.manager?.name ?? "Non désigné"}</dd></div>
            </dl>
          </TicketPanel>

          <TicketPanel title="Détails" subtitle="Dates et échéances">
            <dl className="kit-dl">
              <div><dt>Nature</dt><dd>{TYPE_LABELS[ticket.type]}</dd></div>
              <div><dt>Créé le</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
              <div><dt>Première réponse avant</dt><dd>{formatDate(ticket.firstResponseDueAt)}</dd></div>
              <div><dt>Résolution avant</dt><dd>{formatDate(ticket.resolutionDueAt)}</dd></div>
              <div><dt>Temps bloqué</dt><dd>{ticket.totalPausedMinutes} min</dd></div>
              {ticket.blockReason ? <div><dt>Blocage</dt><dd>{BLOCK_REASON_LABELS[ticket.blockReason]}</dd></div> : null}
            </dl>
          </TicketPanel>

          {ticket.dossier || ticket.mission ? (
            <TicketPanel title="Contexte de production" subtitle="Dossier, mission et temps">
              <dl className="kit-dl">
                <div><dt>Client</dt><dd>{ticket.dossier?.client.name ?? "Non renseigné"}</dd></div>
                <div><dt>Dossier</dt><dd>{ticket.dossier ? <Link href={`/dossiers/${ticket.dossier.id}` as Route}>{ticket.dossier.code}</Link> : "Non rattaché"}</dd></div>
                <div><dt>Mission</dt><dd>{ticket.mission ? <Link href={`/missions/${ticket.mission.id}` as Route}>{ticket.mission.code}</Link> : "Non rattachée"}</dd></div>
                <div><dt>Budget mission</dt><dd>{ticket.mission?.budgetMinutes ? formatMinutes(ticket.mission.budgetMinutes) : "Non défini"}</dd></div>
                <div><dt>Temps mission</dt><dd>{formatMinutes(ticket.missionWorklogMinutes)}</dd></div>
                <div><dt>Temps sur ticket</dt><dd>{formatMinutes(ticket.worklogSummary.minutes)} · {ticket.worklogSummary.entries} saisie(s)</dd></div>
              </dl>
            </TicketPanel>
          ) : null}

          <TicketAdvancedPanels
            only="management"
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
        </aside>
      </div>
    </div>
  );
}
