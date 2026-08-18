import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
import { TicketActions } from "@/components/ticket-actions";
import { TicketAdvancedPanels } from "@/components/ticket-advanced-panels";
import { AutoRefresh } from "@/components/auto-refresh";
import { BLOCK_REASON_LABELS, TYPE_LABELS } from "@/lib/domain";
import { getTicketSlaState } from "@/lib/sla";
import { getTicketActionContext, getTicketForViewer } from "@/lib/ticket-service";
import { getSessionUserContext, roleCodes } from "@/lib/server-auth";

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

  let ticket;
  try {
    ticket = await getTicketForViewer(user, (await params).id);
  } catch {
    notFound();
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

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={5000} />
      <div>
        <Link href={operational ? "/inbox" : "/tickets"} className="text-xs font-semibold text-[#4c4dba] hover:underline">← {operational ? "Retour à la boîte agent" : "Retour à mes tickets"}</Link>
        <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <p className="eyebrow">{ticket.reference}</p>
            <h1 className="mt-2 max-w-4xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{ticket.title}</h1>
            <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-500">Département source : {ticket.sourceDepartment?.name ?? "Non renseigné"} · Département cible : {ticket.queue.department.name} · File : {ticket.queue.name} · Service : {ticket.serviceCatalogItem.name}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /><SlaBadge state={sla.state} dueAt={sla.dueAt} /></div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <div className="space-y-5">
          <section className="panel p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Description</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.description}</p>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div><p className="eyebrow">Timeline</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Historique chronologique</h2><p className="mt-1 text-xs leading-5 text-slate-500">Événements, affectations et commentaires dans l’ordre d’enregistrement.</p></div>
              <span className="shrink-0 text-[11px] text-slate-400">{timeline.length} éléments</span>
            </div>
            <div className="mt-6 space-y-4">
              {timeline.map((item) => {
                if (item.kind === "event") {
                  const mode = assignmentMode(item.event.metadata);
                  return <div key={"event-" + item.event.id} className="relative flex gap-3 pl-1"><div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5b5bd6] ring-4 ring-[#f0f0ff]" /><div><p className="text-sm font-semibold text-slate-800">{eventLabels[item.event.eventType] ?? item.event.eventType.replaceAll("_", " ")}</p><p className="mt-1 text-[11px] text-slate-400">{item.event.actor?.name ?? "Système"} · {formatDate(item.event.createdAt)}</p>{mode ? <p className="mt-1 text-xs text-slate-500">Mode d’affectation : {mode}</p> : null}</div></div>;
                }
                if (item.kind === "assignment") {
                  return <div key={"assignment-" + item.assignment.id} className="rounded-lg border border-[#dfe1f9] bg-[#f7f7ff] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4c4dba]">Historique d’affectation</p><p className="mt-2 text-sm text-slate-700">{item.assignment.previousAssignee?.name ?? "Non affecté"} → {item.assignment.newAssignee?.name ?? "Non affecté"}</p><p className="mt-1 text-[11px] text-slate-500">Par {item.assignment.assignedBy?.name ?? "Système"} · {formatDate(item.assignment.assignedAt)}</p></div>;
                }
                return <div key={"message-" + item.message.id} className={`rounded-lg border p-4 ${item.message.visibility === "INTERNAL" ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50/70"}`}><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{item.message.author.name}</p><p className="text-[11px] font-semibold text-slate-500">{item.message.visibility === "INTERNAL" ? "Commentaire interne" : "Commentaire public"}</p></div><p className="mt-1 text-[11px] text-slate-400">{formatDate(item.message.createdAt)}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message.body}</p></div>;
              })}
              {!timeline.length ? <p className="text-sm text-slate-500">Aucun événement ou échange enregistré.</p> : null}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel p-5">
            <p className="eyebrow">Récapitulatif</p>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Demandeur</dt><dd className="text-right font-semibold text-slate-800">{ticket.requester.name}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Responsable de file</dt><dd className="text-right font-semibold text-slate-800">{ticket.queue.manager?.name ?? "Non désigné"}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Agent</dt><dd className="text-right font-semibold text-slate-800">{ticket.assignedTo?.name ?? "Non affecté"}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Nature</dt><dd className="text-right font-semibold text-slate-800">{TYPE_LABELS[ticket.type]}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Créé le</dt><dd className="text-right font-semibold text-slate-800">{formatDate(ticket.createdAt)}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Première réponse avant</dt><dd className="text-right font-semibold text-slate-800">{formatDate(ticket.firstResponseDueAt)}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Première réponse</dt><dd className="text-right font-semibold text-slate-800">{formatDate(ticket.firstRespondedAt)}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Résolution avant</dt><dd className="text-right font-semibold text-slate-800">{formatDate(ticket.resolutionDueAt)}</dd></div>
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Temps bloqué</dt><dd className="text-right font-semibold text-slate-800">{ticket.totalPausedMinutes} min</dd></div>
              {ticket.blockReason ? <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Blocage</dt><dd className="text-right font-semibold text-slate-800">{BLOCK_REASON_LABELS[ticket.blockReason]}</dd></div> : null}
            </dl>
          </section>
          {ticket.dossier || ticket.mission ? <section className="panel p-5"><p className="eyebrow">Contexte de production</p><h2 className="mt-1 text-base font-semibold text-slate-900">Dossier et mission associés</h2><dl className="mt-4 divide-y divide-slate-100 text-sm"><div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Client</dt><dd className="text-right font-semibold text-slate-800">{ticket.dossier?.client.name ?? "Non renseigné"}</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Dossier</dt><dd className="text-right font-semibold text-[#4c4dba]">{ticket.dossier ? <Link href={`/dossiers/${ticket.dossier.id}` as Route}>{ticket.dossier.code}</Link> : "Non rattaché"}</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Mission</dt><dd className="text-right font-semibold text-[#4c4dba]">{ticket.mission ? <Link href={`/missions/${ticket.mission.id}` as Route}>{ticket.mission.code}</Link> : "Non rattachée"}</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Budget mission</dt><dd className="text-right font-semibold text-slate-800">{ticket.mission?.budgetMinutes ? formatMinutes(ticket.mission.budgetMinutes) : "Non défini"}</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Temps mission</dt><dd className="text-right font-semibold text-slate-800">{formatMinutes(ticket.missionWorklogMinutes)}</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Temps sur ce ticket</dt><dd className="text-right font-semibold text-slate-800">{formatMinutes(ticket.worklogSummary.minutes)} <span className="text-[10px] font-normal text-slate-400">· {ticket.worklogSummary.entries} saisie(s)</span></dd></div></dl></section> : null}
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
        </div>
      </div>
    </div>
  );
}
