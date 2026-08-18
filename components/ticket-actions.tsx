"use client";

import { FormEvent, useState } from "react";
import { BlockReason, MessageVisibility, TicketStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { BLOCK_REASON_LABELS, STATUS_LABELS } from "@/lib/domain";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type AgentOption = { id: string; name: string; email: string };
type QueueOption = { id: string; name: string; departmentName: string };

export function TicketActions({
  ticketId,
  status,
  canClaim,
  canAssign,
  canTransfer,
  requiresAdministrativeReason,
  canPostPublic,
  canPostInternal,
  allowedStatuses,
  agents,
  transferableQueues,
}: {
  ticketId: string;
  status: TicketStatus;
  canClaim: boolean;
  canAssign: boolean;
  canTransfer: boolean;
  requiresAdministrativeReason: boolean;
  canPostPublic: boolean;
  canPostInternal: boolean;
  allowedStatuses: TicketStatus[];
  agents: AgentOption[];
  transferableQueues: QueueOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [nextStatus, setNextStatus] = useState<TicketStatus>(allowedStatuses[0] ?? status);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>(MessageVisibility.REQUESTER);
  const [blockReason, setBlockReason] = useState<BlockReason>(BlockReason.MISSING_INFORMATION);
  const [blockDetails, setBlockDetails] = useState("");
  const [cause, setCause] = useState("");
  const [action, setAction] = useState("");
  const [solution, setSolution] = useState("");
  const [reopenedReason, setReopenedReason] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [assignedToId, setAssignedToId] = useState(agents[0]?.id ?? "");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [destinationQueueId, setDestinationQueueId] = useState(transferableQueues[0]?.id ?? "");
  const [transferReason, setTransferReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; confirmLabel?: string; run: () => void } | null>(null);

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

  async function transition(event: FormEvent) {
    event.preventDefault();
    const payload = {
      status: nextStatus,
      reason: transitionReason || undefined,
      blockReason: nextStatus === TicketStatus.BLOCKED ? blockReason : undefined,
      blockDetails: nextStatus === TicketStatus.BLOCKED ? blockDetails : undefined,
      resolutionCause: nextStatus === TicketStatus.RESOLUTION_PENDING ? cause : undefined,
      resolutionAction: nextStatus === TicketStatus.RESOLUTION_PENDING ? action : undefined,
      resolutionSolution: nextStatus === TicketStatus.RESOLUTION_PENDING ? solution : undefined,
      reopenedReason: nextStatus === TicketStatus.REOPENED ? reopenedReason : undefined,
    };
    setConfirmation({ title: "Confirmer l’évolution du ticket", description: `Le ticket sera déplacé vers « ${STATUS_LABELS[nextStatus]} ». Cette action sera enregistrée dans l’historique.`, confirmLabel: "Confirmer la transition", run: () => { void post("/api/tickets/" + ticketId + "/transition", payload, "Transition enregistrée."); } });
  }

  async function message(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    const sent = await post("/api/tickets/" + ticketId + "/messages", { body, visibility });
    if (sent) setBody("");
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

  return (
    <div className="space-y-3">
      {error ? <div role="alert" aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {canClaim ? (
        <section className="action-card border-[#dfe1f9] bg-[#f7f7ff]">
          <p className="text-sm font-semibold text-slate-900">Ticket non affecté</p>
          <p className="mt-1 text-xs text-slate-600">Vous êtes un agent actif habilité dans l’équipe de cette file.</p>
          <button type="button" onClick={() => setConfirmation({ title: "Confirmer la prise en charge", description: "Vous deviendrez l’agent responsable de ce ticket. Cette action sera visible dans l’historique.", confirmLabel: "Prendre en charge", run: () => { void post("/api/tickets/" + ticketId + "/claim", {}, "Ticket pris en charge."); } })} disabled={busy} className="button-primary mt-4">
            {busy ? "Prise en charge…" : "Prendre en charge"}
          </button>
        </section>
      ) : null}

      {allowedStatuses.length ? (
        <form onSubmit={transition} className="action-card space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Faire évoluer le workflow</p>
            <p className="mt-1 text-xs text-slate-500">Seules les transitions autorisées pour votre rôle et l’état actuel sont proposées.</p>
          </div>
          <label className="field-label">Nouvelle étape
            <Combobox value={nextStatus} onChange={(next) => setNextStatus(next as TicketStatus)} options={allowedStatuses.map((item) => ({ value: item, label: STATUS_LABELS[item] }))} />
          </label>
          {nextStatus === TicketStatus.BLOCKED ? (
            <div className="grid gap-3">
              <label className="field-label">Motif du blocage
                <Combobox required value={blockReason} onChange={(next) => setBlockReason(next as BlockReason)} options={Object.values(BlockReason).map((item) => ({ value: item, label: BLOCK_REASON_LABELS[item] }))} />
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
          {requiresAdministrativeReason ? (
            <label className="field-label text-amber-800">Motif de l’action administrative
              <textarea required minLength={10} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder="Motif obligatoire, 10 caractères minimum." className="field-control min-h-24 border-amber-200 bg-amber-50/40 font-normal" />
            </label>
          ) : null}
          <button disabled={busy || (requiresAdministrativeReason && transitionReason.trim().length < 10)} className="button-primary">Enregistrer la transition</button>
        </form>
      ) : null}

      {canAssign && agents.length ? (
        <form onSubmit={assign} className="action-card space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Affecter ou réaffecter</p>
            <p className="mt-1 text-xs text-slate-500">Seuls les agents actifs membres d’une équipe de cette file sont proposés.</p>
          </div>
          <label className="field-label">Agent
            <Combobox value={assignedToId} onChange={setAssignedToId} options={agents.map((agent) => ({ value: agent.id, label: `${agent.name} — ${agent.email}` }))} />
          </label>
          <label className="field-label">Motif obligatoire
            <input required minLength={10} value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} placeholder="Expliquez l’affectation ou la réaffectation." className="field-control font-normal" />
          </label>
          <button disabled={busy || assignmentReason.trim().length < 10} className="button-secondary">Affecter le ticket</button>
        </form>
      ) : null}

      {canTransfer && transferableQueues.length ? (
        <form onSubmit={transfer} className="action-card space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Réorienter vers une autre file</p>
            <p className="mt-1 text-xs text-slate-500">Le nouveau routage conserve le SLA, l’historique et le contexte du ticket.</p>
          </div>
          <label className="field-label">File cible
            <Combobox value={destinationQueueId} onChange={setDestinationQueueId} options={transferableQueues.map((queue) => ({ value: queue.id, label: `${queue.departmentName} — ${queue.name}` }))} />
          </label>
          <label className="field-label">Motif du transfert
            <textarea required minLength={10} value={transferReason} onChange={(event) => setTransferReason(event.target.value)} placeholder="Expliquez pourquoi la file doit changer." className="field-control min-h-24 font-normal" />
          </label>
          <button disabled={busy || transferReason.trim().length < 10} className="button-secondary">Réorienter le ticket</button>
        </form>
      ) : null}

      {canPostPublic ? (
        <form onSubmit={message} className="action-card space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Ajouter un commentaire</p>
            <p className="mt-1 text-xs text-slate-500">Les commentaires publics sont visibles par le demandeur. Les commentaires internes restent réservés à l’équipe habilitée.</p>
          </div>
          <textarea required minLength={1} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Écrivez votre message…" className="field-control min-h-28" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canPostInternal ? (
              <Combobox value={visibility} onChange={(next) => setVisibility(next as MessageVisibility)} className="w-auto min-w-[12rem]" options={[{ value: MessageVisibility.REQUESTER, label: "Commentaire public" }, { value: MessageVisibility.INTERNAL, label: "Commentaire interne" }]} />
            ) : <p className="text-xs text-slate-500">Votre message sera visible par le demandeur.</p>}
            <button disabled={busy || !body.trim()} className="button-primary">Publier le commentaire</button>
          </div>
        </form>
      ) : null}
      <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title ?? "Confirmer l’action"} description={confirmation?.description ?? ""} confirmLabel={confirmation?.confirmLabel} busy={busy} onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation; setConfirmation(null); action?.run(); }} />
    </div>
  );
}
