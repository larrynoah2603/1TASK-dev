"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { Combobox } from "@/components/combobox";

type DepartmentOption = { id: string; code: string; name: string };
type ProductionDossier = { id: string; code: string; name: string; client: { id: string; code: string; name: string } };
type ProductionMission = { id: string; code: string; name: string; status: string; dossier: { id: string; code: string; name: string; client: { id: string; code: string; name: string } } };

const typeLabels: Record<string, string> = {
  INCIDENT: "Incident",
  SERVICE_REQUEST: "Demande de service",
  PRODUCTION_TASK: "Tâche de production",
  CHANGE_REQUEST: "Demande de changement",
};

const impactLabels: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Élevé",
  CRITICAL: "Critique",
};

const urgencyLabels: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  CRITICAL: "Critique",
};

function createClientIdempotencyToken() {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `web-${uuid.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

const CREATION_TIMEOUT_MS = 30_000;
const RECONCILIATION_ATTEMPTS = 4;
const RECONCILIATION_DELAY_MS = 1_500;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function NewTicketForm({ onCancel }: { onCancel?: () => void } = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [requestedService, setRequestedService] = useState("");
  const [type, setType] = useState("SERVICE_REQUEST");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [impact, setImpact] = useState("MEDIUM");
  const [urgency, setUrgency] = useState("MEDIUM");
  const [legalDueAt, setLegalDueAt] = useState("");
  const [dossiers, setDossiers] = useState<ProductionDossier[]>([]);
  const [missions, setMissions] = useState<ProductionMission[]>([]);
  const [dossierId, setDossierId] = useState("");
  const [missionId, setMissionId] = useState("");
  const [canAttachProductionContext, setCanAttachProductionContext] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [preview, setPreview] = useState(false);
  const creationIdempotencyToken = useRef(createClientIdempotencyToken()).current;

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
    fetch("/api/departments", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("department-error");
        return response.json() as Promise<DepartmentOption[]>;
      })
      .then(setDepartments)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          setError("Les départements mettent trop de temps à répondre. Réessayez après le redémarrage de l’application.");
          return;
        }
        setError("Impossible de charger les départements actifs.");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoadingDepartments(false);
      });
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/production/dossiers"), fetch("/api/production/missions")])
      .then(async ([dossierResponse, missionResponse]) => {
        if (!dossierResponse.ok || !missionResponse.ok) return;
        const [dossierData, missionData] = await Promise.all([
          dossierResponse.json() as Promise<{ dossiers: ProductionDossier[] }>,
          missionResponse.json() as Promise<{ missions: ProductionMission[] }>,
        ]);
        setDossiers(dossierData.dossiers);
        setMissions(missionData.missions);
        setCanAttachProductionContext(true);
      })
      .catch(() => undefined);
  }, []);

  const targetDepartment = departments.find((department) => department.id === targetDepartmentId);
  const availableMissions = missionId || !dossierId ? missions : missions.filter((mission) => mission.dossier.id === dossierId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CREATION_TIMEOUT_MS);
    const payload = {
      creationIdempotencyToken,
      requestedService,
      targetDepartmentId,
      type,
      title,
      description,
      confidential,
      impact,
      urgency,
      legalDueAt: legalDueAt ? new Date(`${legalDueAt}T23:59:59`).toISOString() : null,
      dossierId: dossierId || null,
      missionId: missionId || null,
    };
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "La création a échoué.");
        toast(data.error ?? "La création a échoué.", "error");
        return;
      }
      toast("Ticket créé et envoyé à la file de qualification.");
      router.push(`/tickets/${data.id}`);
    } catch (requestError: unknown) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("La réponse tarde. Vérification de la création en cours…");
        for (let attempt = 0; attempt < RECONCILIATION_ATTEMPTS; attempt += 1) {
          if (attempt > 0) await wait(RECONCILIATION_DELAY_MS);
          try {
            const statusResponse = await fetch(
              `/api/tickets/creation-status?token=${encodeURIComponent(creationIdempotencyToken)}`,
              { cache: "no-store" },
            );
            if (!statusResponse.ok) continue;
            const statusData = await statusResponse.json() as { ticket: { id: string } | null };
            if (statusData.ticket) {
              toast("Ticket créé. La réponse initiale avait simplement expiré.");
              router.push(`/tickets/${statusData.ticket.id}`);
              return;
            }
          } catch {
            // A reconciliation attempt is best-effort; the next one may succeed.
          }
        }
      }
      const message = requestError instanceof DOMException && requestError.name === "AbortError"
        ? "La création n’a pas pu être confirmée après 30 secondes. Réessayez : l’identifiant conservé empêchera tout doublon."
        : "La création n’a pas pu être envoyée.";
      setError(message);
      toast(message, "error");
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  const canPreview = Boolean(requestedService.trim().length >= 3 && targetDepartmentId && title.trim().length >= 5 && description.trim().length >= 15);
  const resetPreview = () => setPreview(false);

  return (
    <form onSubmit={submit} aria-busy={submitting || loadingDepartments} className="ticket-composer ticket-composer-industrial panel max-w-4xl space-y-6 p-5 sm:p-7 md:p-8">
      <ol className="form-progress" aria-label="Étapes de création du ticket">
        <li className={!preview ? "form-progress-active" : "form-progress-complete"}><span>01</span><strong>Décrire</strong></li>
        <li className={preview ? "form-progress-active" : ""}><span>02</span><strong>Vérifier</strong></li>
      </ol>
      <div className="form-step-header flex items-start gap-3 border-b border-slate-100 pb-5">
        <span className="ticket-form-step-marker grid h-9 w-9 shrink-0 place-items-center text-sm font-bold">01</span>
        <div>
          <h2 className="text-base font-semibold text-slate-950">Parlons de votre besoin</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Décrivez votre besoin ; l’équipe du département choisi le qualifiera ensuite.</p>
        </div>
      </div>
      {error ? <div role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="route-panel rounded-lg kit-callout p-5" aria-labelledby="free-request-title">
        <div className="flex items-center justify-between gap-3"><div><p id="free-request-title" className="ticket-route-kicker text-[10px] font-bold uppercase tracking-[0.14em]">Saisie libre</p><p className="mt-1 text-xs leading-5 text-slate-600">Le catalogue n’est pas imposé au demandeur.</p></div><span className="ticket-route-badge px-2 py-1 text-[10px] font-semibold">Qualification requise</span></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="field-label sm:col-span-2">Besoin demandé<textarea required minLength={3} maxLength={180} value={requestedService} onChange={(event) => { setRequestedService(event.target.value); resetPreview(); }} className="field-control min-h-20" placeholder="Ex. Création d’un compte client" /></label>
          <label className="field-label">Département cible<Combobox required disabled={loadingDepartments} value={targetDepartmentId} onChange={(next) => { setTargetDepartmentId(next); resetPreview(); }} placeholder={loadingDepartments ? "Chargement…" : "Choisir un département"} options={[{ value: "", label: loadingDepartments ? "Chargement…" : "Choisir un département" }, ...departments.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` }))]} /></label>
          <label className="field-label">Nature de la demande<Combobox value={type} onChange={(next) => { setType(next); resetPreview(); }} options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} /></label>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">Le système enverra la demande vers la file de triage du département choisi. L’agent déterminera ensuite le service catalogue, la priorité et le traitement adaptés.</p>
      </section>

      {targetDepartment ? <section className="route-panel rounded-lg border border-amber-200 bg-amber-50/60 p-5" aria-labelledby="triage-summary-title"><p id="triage-summary-title" className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">Routage prévu</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Département</dt><dd className="font-semibold text-slate-800">{targetDepartment.name}</dd></div><div><dt className="text-slate-500">File</dt><dd className="font-semibold text-slate-800">Triage {targetDepartment.code}</dd></div><div><dt className="text-slate-500">Statut initial</dt><dd className="font-semibold text-slate-800">À qualifier</dd></div><div><dt className="text-slate-500">Catalogue</dt><dd className="font-semibold text-slate-800">Déterminé par l’équipe</dd></div></dl></section> : null}

      <label className="field-label">Objet<input id="title" required minLength={5} maxLength={180} value={title} onChange={(event) => { setTitle(event.target.value); resetPreview(); }} className="field-control" placeholder="Ex. Problème de connexion Wi-Fi" /></label>
      <label className="field-label"><span className="flex items-center justify-between gap-3">Description <span className="font-normal text-[11px] text-slate-400">Minimum 15 caractères</span></span><textarea id="description" required minLength={15} maxLength={20000} value={description} onChange={(event) => { setDescription(event.target.value); resetPreview(); }} className="field-control min-h-40" placeholder="Décrivez le contexte, le message affiché et les impacts constatés." /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">Impact<Combobox value={impact} onChange={(next) => { setImpact(next); resetPreview(); }} options={Object.entries(impactLabels).map(([value, label]) => ({ value, label }))} /></label>
        <label className="field-label">Urgence<Combobox value={urgency} onChange={(next) => { setUrgency(next); resetPreview(); }} options={Object.entries(urgencyLabels).map(([value, label]) => ({ value, label }))} /></label>
      </div>
      <label className="field-label">Échéance légale ou métier <input id="legalDueAt" type="date" value={legalDueAt} onChange={(event) => { setLegalDueAt(event.target.value); resetPreview(); }} className="field-control" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Facultatif. L’urgence reste calculée séparément par la matrice impact × urgence.</span></label>
      {canAttachProductionContext ? <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"><div><p className="eyebrow">Contexte de production</p><h3 className="mt-1 text-sm font-semibold text-slate-900">Rattacher ce ticket à un dossier ou une mission</h3><p className="mt-1 text-xs leading-5 text-slate-500">Facultatif. Les options sont limitées à votre périmètre autorisé et contrôlées à nouveau lors de la création.</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Dossier client<Combobox value={dossierId} onChange={(next) => { setDossierId(next); const selectedMission = missions.find((mission) => mission.id === missionId); if (selectedMission && next && selectedMission.dossier.id !== next) setMissionId(""); resetPreview(); }} placeholder="Aucun dossier" options={[{ value: "", label: "Aucun dossier" }, ...dossiers.map((dossier) => ({ value: dossier.id, label: `${dossier.client.name} · ${dossier.code} · ${dossier.name}` }))]} /></label><label className="field-label">Mission<Combobox value={missionId} onChange={(next) => { const selectedMission = missions.find((mission) => mission.id === next); setMissionId(next); if (selectedMission) setDossierId(selectedMission.dossier.id); resetPreview(); }} placeholder="Aucune mission" options={[{ value: "", label: "Aucune mission" }, ...availableMissions.map((mission) => ({ value: mission.id, label: `${mission.code} · ${mission.name}` }))]} /></label></div></section> : null}
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700"><input type="checkbox" checked={confidential} onChange={(event) => { setConfidential(event.target.checked); resetPreview(); }} className="mt-0.5 h-4 w-4 accent-[var(--kit-primary)]" /><span><span className="font-semibold">Dossier confidentiel</span><span className="mt-1 block text-xs leading-5 text-slate-500">L’accès sera limité aux personnes habilitées et nominativement autorisées.</span></span></label>
      {preview ? <section className="preview-panel" aria-labelledby="ticket-preview-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Dernière vérification</p><h2 id="ticket-preview-title" className="mt-1 text-lg font-bold text-slate-900">Prévisualisation du ticket</h2></div><span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-800">À qualifier</span></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Besoin</dt><dd className="mt-1 font-semibold text-slate-900">{requestedService}</dd></div><div><dt className="text-xs text-slate-500">Routage</dt><dd className="mt-1 font-semibold text-slate-900">{targetDepartment?.name} · Triage {targetDepartment?.code}</dd></div><div><dt className="text-xs text-slate-500">Nature</dt><dd className="mt-1 font-semibold text-slate-900">{typeLabels[type] ?? type}</dd></div><div><dt className="text-xs text-slate-500">Impact / urgence</dt><dd className="mt-1 font-semibold text-slate-900">{impactLabels[impact]} · {urgencyLabels[urgency]}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-500">Objet</dt><dd className="mt-1 font-semibold text-slate-900">{title}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-500">Description</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{description}</dd></div><div><dt className="text-xs text-slate-500">Confidentialité</dt><dd className="mt-1 font-semibold text-slate-900">{confidential ? "Dossier confidentiel" : "Dossier standard"}</dd></div>{dossierId || missionId ? <div><dt className="text-xs text-slate-500">Contexte</dt><dd className="mt-1 font-semibold text-slate-900">{missions.find((mission) => mission.id === missionId)?.code ?? dossiers.find((dossier) => dossier.id === dossierId)?.code ?? "Rattaché"}</dd></div> : null}</dl></section> : null}
      <div className="form-actions flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => onCancel ? onCancel() : router.back()} className="button-secondary">Annuler</button>{preview ? <><button type="button" onClick={() => setPreview(false)} className="button-secondary">Modifier</button><button type="submit" disabled={submitting || loadingDepartments} className="button-primary">{submitting ? "Création…" : "Confirmer et créer"}</button></> : <button type="button" disabled={submitting || loadingDepartments || !canPreview} onClick={() => setPreview(true)} className="button-primary">{loadingDepartments ? "Chargement des départements…" : !requestedService.trim() ? "Décrivez votre besoin" : !targetDepartmentId ? "Choisissez un département" : title.trim().length < 5 ? "Objet : 5 caractères minimum" : description.trim().length < 15 ? "Description : 15 caractères minimum" : "Prévisualiser le ticket"}</button>}</div>
    </form>
  );
}
