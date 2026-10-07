"use client";

import { FormEvent, useState } from "react";
import { BlockReason, TicketStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { BLOCK_REASON_LABELS, STATUS_LABELS } from "@/lib/domain";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";
import { TicketSidePanel } from "@/components/ticket-side-panel";

type AgentOption = { id: string; name: string; email: string };
type QueueOption = { id: string; name: string; departmentName: string };

export function TicketActions({
  ticketId,
  status,
  canClaim,
  canAssign,
  canTransfer,
  requiresAdministrativeReason,
  allowedStatuses,
  simplifiedV1 = false,
  requesterView = false,
  workspaceMode = false,
}: {
  ticketId: string;
  status: TicketStatus;
  canClaim: boolean;
  canAssign: boolean;
  canTransfer: boolean;
  requiresAdministrativeReason: boolean;
  allowedStatuses: TicketStatus[];
  simplifiedV1?: boolean;
  requesterView?: boolean;
  workspaceMode?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [nextStatus, setNextStatus] = useState<TicketStatus>(allowedStatuses[0] ?? status);
  const [blockReason, setBlockReason] = useState<BlockReason>(BlockReason.MISSING_INFORMATION);
  const [blockDetails, setBlockDetails] = useState("");
  const [cause, setCause] = useState("");
  const [action, setAction] = useState("");
  const [solution, setSolution] = useState("");
  const [reopenedReason, setReopenedReason] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [assignedToId, setAssignedToId] = useState("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [transferableQueues, setTransferableQueues] = useState<QueueOption[]>([]);
  const [queuesLoaded, setQueuesLoaded] = useState(false);
  const [queuesLoading, setQueuesLoading] = useState(false);
  const [destinationQueueId, setDestinationQueueId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; confirmLabel?: string; run: () => void } | null>(null);

  async function loadAssignmentOptions() {
    if (agentsLoaded || agentsLoading || !canAssign) return;
    setAgentsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tickets/${ticketId}/action-options?kind=assign`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Chargement refusé.");
      const nextAgents = (data.agents ?? []) as AgentOption[];
      setAgents(nextAgents);
      setAssignedToId((current) => current || nextAgents[0]?.id || "");
      setAgentsLoaded(true);
    } catch {
      setError("Les agents affectables n’ont pas pu être chargés.");
    } finally {
      setAgentsLoading(false);
    }
  }

  async function loadTransferOptions() {
    if (queuesLoaded || queuesLoading || !canTransfer) return;
    setQueuesLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tickets/${ticketId}/action-options?kind=transfer`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Chargement refusé.");
      const nextQueues = (data.queues ?? []) as QueueOption[];
      setTransferableQueues(nextQueues);
      setDestinationQueueId((current) => current || nextQueues[0]?.id || "");
      setQueuesLoaded(true);
    } catch {
      setError("Les files de réorientation n’ont pas pu être chargées.");
    } finally {
      setQueuesLoading(false);
    }
  }

  async function post(path: string, payload: unknown, successMessage = "Action enregistrée.") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Action refusée.");
        toast(data.error ?? "Action refusée.", "error");
        return false;
      }
      toast(successMessage);
      router.refresh();
      return true;
    } catch {
      setError("L’action n’a pas pu être envoyée.");
      toast("L’action n’a pas pu être envoyée.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function transitionPayload(targetStatus: TicketStatus) {
    return {
      status: targetStatus,
      reason: transitionReason || undefined,
      blockReason: targetStatus === TicketStatus.BLOCKED ? blockReason : undefined,
      blockDetails: targetStatus === TicketStatus.BLOCKED ? blockDetails : undefined,
      resolutionCause: targetStatus === TicketStatus.RESOLUTION_PENDING ? cause : undefined,
      resolutionAction: targetStatus === TicketStatus.RESOLUTION_PENDING ? action : undefined,
      resolutionSolution: targetStatus === TicketStatus.RESOLUTION_PENDING ? solution : undefined,
      reopenedReason: targetStatus === TicketStatus.REOPENED ? reopenedReason : undefined,
    };
  }

  function confirmTransition(targetStatus: TicketStatus, confirmLabel = "Confirmer la transition", successMessage = "Transition enregistrée.") {
    const payload = transitionPayload(targetStatus);
    setConfirmation({
      title: "Confirmer l’évolution du ticket",
      description: `Le ticket sera déplacé vers « ${STATUS_LABELS[targetStatus]} ». Cette action sera enregistrée dans l’historique.`,
      confirmLabel,
      run: () => { void post("/api/tickets/" + ticketId + "/transition", payload, successMessage); },
    });
  }

  async function transition(event: FormEvent) {
    event.preventDefault();
    confirmTransition(nextStatus);
  }

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!assignedToId) return;
    setConfirmation({ title: "Confirmer l’affectation", description: "L’agent sélectionné deviendra responsable du traitement de ce ticket. L’opération sera historisée.", confirmLabel: "Confirmer l’affectation", run: () => { void post("/api/tickets/" + ticketId + "/assign", { assignedToId, reason: assignmentReason }, "Affectation enregistrée."); } });
  }

  async function transfer(event: FormEvent) {
    event.preventDefault();
    if (!destinationQueueId || transferReason.trim().length < 10) return;
    setConfirmation({ title: "Confirmer la réorientation", description: "Le ticket sera transféré vers la file sélectionnée et l’opération sera enregistrée dans l’historique.", confirmLabel: "Confirmer le transfert", run: () => { void post("/api/tickets/" + ticketId + "/queue", { queueId: destinationQueueId, reason: transferReason }, "Réorientation enregistrée."); } });
  }

  const canStartOrResume = allowedStatuses.includes(TicketStatus.IN_PROGRESS);
  const canPause = allowedStatuses.includes(TicketStatus.BLOCKED);
  const canSubmitResolution = allowedStatuses.includes(TicketStatus.RESOLUTION_PENDING);
  const canConfirmResolution = allowedStatuses.includes(TicketStatus.CLOSED);
  const canReopenResolution = allowedStatuses.includes(TicketStatus.REOPENED);
  const canCancel = allowedStatuses.includes(TicketStatus.CANCELLED);
  const hasSimplifiedActions = canStartOrResume || canPause || canSubmitResolution || canConfirmResolution || canReopenResolution || canCancel;

  return (
    <div className="space-y-3">
      {error ? <div role="alert" aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {canClaim ? (
        <TicketSidePanel title={workspaceMode ? "Prochaine action" : "Prise en charge"} subtitle="Devenir responsable du traitement" defaultOpen>
          <section className="action-card kit-callout">
          <p className="text-sm font-semibold text-slate-900">Ticket non affecté</p>
          <p className="mt-1 text-xs text-slate-600">Vous êtes un agent actif habilité dans l’équipe de cette file.</p>
          <button type="button" onClick={() => setConfirmation({ title: "Confirmer la prise en charge", description: "Vous deviendrez l’agent responsable de ce ticket. Cette action sera visible dans l’historique.", confirmLabel: "Prendre en charge", run: () => { void post("/api/tickets/" + ticketId + "/claim", {}, "Ticket pris en charge."); } })} disabled={busy} className="button-primary mt-4">
            {busy ? "Prise en charge…" : "Prendre en charge"}
          </button>
          </section>
        </TicketSidePanel>
      ) : null}

      {simplifiedV1 ? (
        hasSimplifiedActions ? (
          <TicketSidePanel
            title={workspaceMode ? "Prochaine action" : requesterView ? "Résolution" : "Traitement"}
            subtitle={requesterView ? "Confirmer ou signaler que le problème persiste" : workspaceMode ? "Agir sans quitter le contexte du ticket" : "Actions utiles pour ce ticket"}
            defaultOpen
          >
            <div className="action-card space-y-4">
              {canStartOrResume ? (
                <form onSubmit={(event) => { event.preventDefault(); confirmTransition(TicketStatus.IN_PROGRESS, status === TicketStatus.BLOCKED || status === TicketStatus.REOPENED ? "Reprendre le traitement" : "Démarrer le traitement", "Traitement démarré."); }} className="space-y-3">
                  {requiresAdministrativeReason ? (
                    <label className="field-label text-amber-800">Motif de l’action administrative
                      <textarea required minLength={10} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder="Motif obligatoire, 10 caractères minimum." className="field-control min-h-20 border-amber-200 bg-amber-50/40 font-normal" />
                    </label>
                  ) : null}
                  <button disabled={busy || (requiresAdministrativeReason && transitionReason.trim().length < 10)} className="button-primary">
                    {status === TicketStatus.BLOCKED || status === TicketStatus.REOPENED ? "Reprendre le traitement" : "Démarrer le traitement"}
                  </button>
                </form>
              ) : null}

              {canPause ? (
                <form onSubmit={(event) => { event.preventDefault(); confirmTransition(TicketStatus.BLOCKED, "Mettre en attente", "Ticket mis en attente."); }} className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Mettre en attente</p>
                  <label className="field-label">Motif du blocage
                    <select required value={blockReason} onChange={(event) => setBlockReason(event.target.value as BlockReason)} className="field-control" aria-label="Motif du blocage">{Object.values(BlockReason).map((item) => <option key={item} value={item}>{BLOCK_REASON_LABELS[item]}</option>)}</select>
                  </label>
                  <label className="field-label">Détail
                    <textarea required minLength={1} value={blockDetails} onChange={(event) => setBlockDetails(event.target.value)} placeholder="Expliquez ce qui est attendu et par qui." className="field-control min-h-20 font-normal" />
                  </label>
                  {requiresAdministrativeReason ? (
                    <label className="field-label text-amber-800">Motif de l’action administrative
                      <textarea required minLength={10} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder="Motif obligatoire, 10 caractères minimum." className="field-control min-h-20 border-amber-200 bg-amber-50/40 font-normal" />
                    </label>
                  ) : null}
                  <button disabled={busy || !blockDetails.trim() || (requiresAdministrativeReason && transitionReason.trim().length < 10)} className="button-secondary">Mettre en attente</button>
                </form>
              ) : null}

              {canSubmitResolution ? (
                <form onSubmit={(event) => { event.preventDefault(); confirmTransition(TicketStatus.RESOLUTION_PENDING, "Proposer la résolution", "Résolution proposée au demandeur."); }} className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Résoudre le ticket</p>
                  <label className="field-label">Cause<input required value={cause} onChange={(event) => setCause(event.target.value)} placeholder="Cause identifiée" className="field-control font-normal" /></label>
                  <label className="field-label">Action réalisée<input required value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action effectuée" className="field-control font-normal" /></label>
                  <label className="field-label">Solution apportée<textarea required minLength={1} value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Décrivez la solution et le résultat." className="field-control min-h-20 font-normal" /></label>
                  {requiresAdministrativeReason ? (
                    <label className="field-label text-amber-800">Motif de l’action administrative
                      <textarea required minLength={10} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder="Motif obligatoire, 10 caractères minimum." className="field-control min-h-20 border-amber-200 bg-amber-50/40 font-normal" />
                    </label>
                  ) : null}
                  <button disabled={busy || !cause.trim() || !action.trim() || !solution.trim() || (requiresAdministrativeReason && transitionReason.trim().length < 10)} className="button-primary">Résoudre le ticket</button>
                </form>
              ) : null}

              {canConfirmResolution ? (
                <button type="button" disabled={busy} onClick={() => confirmTransition(TicketStatus.CLOSED, "Confirmer la résolution", "Résolution confirmée.")} className="button-primary">
                  Confirmer la résolution
                </button>
              ) : null}

              {canReopenResolution ? (
                <form onSubmit={(event) => { event.preventDefault(); confirmTransition(TicketStatus.REOPENED, "Le problème persiste", "Ticket rouvert."); }} className="space-y-3">
                  <label className="field-label">Le problème persiste
                    <textarea required minLength={1} value={reopenedReason} onChange={(event) => setReopenedReason(event.target.value)} placeholder="Expliquez ce qui ne fonctionne toujours pas." className="field-control min-h-20 font-normal" />
                  </label>
                  <button disabled={busy || !reopenedReason.trim()} className="button-secondary">Le problème persiste</button>
                </form>
              ) : null}

              {canCancel ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const reason = cancellationReason.trim();
                    if (reason.length < 10) return;
                    setConfirmation({
                      title: "Confirmer l’annulation",
                      description: "Le ticket sera annulé définitivement et restera disponible en lecture seule dans l’historique.",
                      confirmLabel: requesterView ? "Annuler ma demande" : "Annuler le ticket",
                      run: () => {
                        void post(
                          "/api/tickets/" + ticketId + "/transition",
                          { status: TicketStatus.CANCELLED, reason },
                          "Ticket annulé.",
                        );
                      },
                    });
                  }}
                  className="space-y-3 border-t border-slate-200 pt-4"
                >
                  <p className="text-sm font-semibold text-rose-700">{requesterView ? "Annuler ma demande" : "Annuler le ticket"}</p>
                  <label className="field-label">Motif de l’annulation
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      value={cancellationReason}
                      onChange={(event) => setCancellationReason(event.target.value)}
                      placeholder="Expliquez pourquoi cette demande doit être annulée."
                      className="field-control min-h-20 font-normal"
                    />
                  </label>
                  <button
                    disabled={busy || cancellationReason.trim().length < 10}
                    className="button-secondary border-rose-200 text-rose-700"
                  >
                    {requesterView ? "Annuler ma demande" : "Annuler le ticket"}
                  </button>
                </form>
              ) : null}
            </div>
          </TicketSidePanel>
        ) : null
      ) : allowedStatuses.length ? (
        <TicketSidePanel title="Workflow" subtitle="Changer l’étape du ticket" defaultOpen={!canClaim}>
          <form onSubmit={transition} className="action-card space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Faire évoluer le workflow</p>
            <p className="mt-1 text-xs text-slate-500">Seules les transitions autorisées pour votre rôle et l’état actuel sont proposées.</p>
          </div>
          <label className="field-label">Nouvelle étape
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as TicketStatus)} className="field-control" aria-label="Nouvelle étape">{allowedStatuses.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select>
          </label>
          {nextStatus === TicketStatus.BLOCKED ? (
            <div className="grid gap-3">
              <label className="field-label">Motif du blocage
                <select required value={blockReason} onChange={(event) => setBlockReason(event.target.value as BlockReason)} className="field-control" aria-label="Motif du blocage">{Object.values(BlockReason).map((item) => <option key={item} value={item}>{BLOCK_REASON_LABELS[item]}</option>)}</select>
              </label>
              <label className="field-label">Détail du blocage
                <textarea required minLength={1} value={blockDetails} onChange={(event) => setBlockDetails(event.target.value)} placeholder="Expliquez ce qui est attendu et par qui." className="field-control min-h-24 font-normal" />
              </label>
            </div>
          ) : null}
          {nextStatus === TicketStatus.RESOLUTION_PENDING ? (
            <div className="grid gap-3">
              <label className="field-label">Cause<input required value={cause} onChange={(event) => setCause(event.target.value)} placeholder="Cause identifiée" className="field-control font-normal" /></label>
              <label className="field-label">Action réalisée<input required value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action effectuée" className="field-control font-normal" /></label>
              <label className="field-label">Solution apportée<textarea required minLength={1} value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Décrivez la solution et le résultat." className="field-control min-h-24 font-normal" /></label>
            </div>
          ) : null}
          {nextStatus === TicketStatus.REOPENED ? (
            <label className="field-label">Motif de réouverture
              <textarea required minLength={1} value={reopenedReason} onChange={(event) => setReopenedReason(event.target.value)} placeholder="Expliquez pourquoi le ticket doit être repris." className="field-control min-h-24 font-normal" />
            </label>
          ) : null}
          {requiresAdministrativeReason || nextStatus === TicketStatus.CANCELLED ? (
            <label className="field-label text-amber-800">{nextStatus === TicketStatus.CANCELLED ? "Motif de l’annulation" : "Motif de l’action administrative"}
              <textarea required minLength={10} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder={nextStatus === TicketStatus.CANCELLED ? "Expliquez clairement pourquoi cette demande est annulée." : "Motif obligatoire, 10 caractères minimum."} className="field-control min-h-24 border-amber-200 bg-amber-50/40 font-normal" />
            </label>
          ) : null}
            <button disabled={busy || ((requiresAdministrativeReason || nextStatus === TicketStatus.CANCELLED) && transitionReason.trim().length < 10)} aria-busy={busy} className="button-primary">{busy ? "Enregistrement…" : "Enregistrer la transition"}</button>
          </form>
        </TicketSidePanel>
      ) : null}

      {canAssign ? (
        <TicketSidePanel title="Affectation" subtitle="Choisir le responsable du traitement" onOpen={() => void loadAssignmentOptions()}>
          <form onSubmit={assign} className="action-card space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Affecter ou réaffecter</p>
            <p className="mt-1 text-xs text-slate-500">Seuls les agents actifs membres d’une équipe de cette file sont proposés.</p>
          </div>
          {agentsLoading ? <p className="text-xs text-slate-500">Chargement des agents habilités…</p> : null}
          {agentsLoaded && !agents.length ? <p className="text-xs text-slate-500">Aucun agent habilité disponible.</p> : null}
          {agents.length ? <label className="field-label">Agent
            <select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)} className="field-control" aria-label="Agent">{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} — {agent.email}</option>)}</select>
          </label> : null}
          <label className="field-label">Motif obligatoire
            <input required minLength={10} value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} placeholder="Expliquez l’affectation ou la réaffectation." className="field-control font-normal" />
          </label>
            <button disabled={busy || !assignedToId || assignmentReason.trim().length < 10} aria-busy={busy} className="button-secondary">{busy ? "Affectation…" : "Affecter le ticket"}</button>
          </form>
        </TicketSidePanel>
      ) : null}

      {canTransfer ? (
        <TicketSidePanel title="Réorientation" subtitle="Transférer vers une autre file" onOpen={() => void loadTransferOptions()}>
          <form onSubmit={transfer} className="action-card space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Réorienter vers une autre file</p>
            <p className="mt-1 text-xs text-slate-500">Le nouveau routage conserve le SLA, l’historique et le contexte du ticket.</p>
          </div>
          {queuesLoading ? <p className="text-xs text-slate-500">Chargement des files autorisées…</p> : null}
          {queuesLoaded && !transferableQueues.length ? <p className="text-xs text-slate-500">Aucune autre file autorisée.</p> : null}
          {transferableQueues.length ? <label className="field-label">File cible
            <select value={destinationQueueId} onChange={(event) => setDestinationQueueId(event.target.value)} className="field-control" aria-label="File cible">{transferableQueues.map((queue) => <option key={queue.id} value={queue.id}>{queue.departmentName} — {queue.name}</option>)}</select>
          </label> : null}
          <label className="field-label">Motif du transfert
            <textarea required minLength={10} value={transferReason} onChange={(event) => setTransferReason(event.target.value)} placeholder="Expliquez pourquoi la file doit changer." className="field-control min-h-24 font-normal" />
          </label>
            <button disabled={busy || !destinationQueueId || transferReason.trim().length < 10} aria-busy={busy} className="button-secondary">{busy ? "Réorientation…" : "Réorienter le ticket"}</button>
          </form>
        </TicketSidePanel>
      ) : null}

      <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title ?? "Confirmer l’action"} description={confirmation?.description ?? ""} confirmLabel={confirmation?.confirmLabel} busy={busy} onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation; setConfirmation(null); action?.run(); }} />
    </div>
  );
}
