"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { Combobox } from "@/components/combobox";
import { V1TicketForm } from "@/components/v1-ticket-form";

type DepartmentOption = { id: string; code: string; name: string };
type CatalogOption = { id: string; code: string; name: string; category: string; ticketType: string; allowConfidentialTickets: boolean; confidentialityVersion: number; confidentialRecipient: { id: string; name: string } | null; confidentialReplacementActive: boolean; queue: { id: string; code: string; name: string; department: DepartmentOption } };
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

const statusLabels: Record<string, string> = {
  NEW: "Nouveau",
  TO_QUALIFY: "À qualifier",
  TO_ASSIGN: "À affecter",
  ASSIGNED: "Affecté",
};

type CreatedTicketResponse = {
  id: string;
  reference?: string;
  status?: string;
  queue?: { name?: string };
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

function FullTicketForm({ onCancel, onCreated }: { onCancel?: () => void; onCreated?: (ticketId: string) => void } = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [serviceCatalogItemId, setServiceCatalogItemId] = useState("");
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
  const submissionInFlight = useRef(false);

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
    fetch("/api/catalog")
      .then(async (response) => response.ok ? response.json() as Promise<CatalogOption[]> : [])
      .then((items) => setCatalog(items.filter((item) => !item.code.startsWith("TRIAGE-"))))
      .catch(() => undefined);
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
  const departmentServices = catalog.filter((service) => service.queue.department.id === targetDepartmentId);
  const selectedService = departmentServices.find((service) => service.id === serviceCatalogItemId);
  const availableMissions = missionId || !dossierId ? missions : missions.filter((mission) => mission.dossier.id === dossierId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CREATION_TIMEOUT_MS);
    const payload = {
      creationIdempotencyToken,
      serviceCatalogItemId: serviceCatalogItemId || undefined,
      requestedService,
      targetDepartmentId,
      type,
      title,
      description,
      confidential,
      confidentialityVersion: confidential ? selectedService?.confidentialityVersion : undefined,
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
      const data = await response.json() as CreatedTicketResponse & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "La création a échoué.");
        toast(data.error ?? "La création a échoué.", "error");
        return;
      }
      if (!response.ok || !data.id) {
        const message = data.error ?? "La création a échoué.";
        setError(message);
        toast(message, "error");
        return;
      }
      const destination = data.queue?.name?.trim();
      toast({
        kind: "success",
        title: "Ticket créé",
        description: destination ? `La demande a été transmise à ${destination}.` : "La demande a été transmise.",
        metadata: [data.reference, data.status ? statusLabels[data.status] ?? data.status : null].filter(Boolean).join(" · ") || undefined,
        action: { label: "Voir le ticket", href: `/tickets/${data.id}` },
        duration: 7_000,
      });
      onCreated?.(data.id);
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
            const statusData = await statusResponse.json() as { ticket: CreatedTicketResponse | null };
            if (statusData.ticket) {
              const reconciledTicket = statusData.ticket;
              toast({
                kind: "success",
                title: "Ticket créé",
                description: "La création a été confirmée après vérification.",
                metadata: [reconciledTicket.reference, reconciledTicket.status ? statusLabels[reconciledTicket.status] ?? reconciledTicket.status : null].filter(Boolean).join(" · ") || undefined,
                action: { label: "Voir le ticket", href: `/tickets/${reconciledTicket.id}` },
                duration: 7_000,
              });
              onCreated?.(reconciledTicket.id);
              router.push(`/tickets/${reconciledTicket.id}`);
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
      submissionInFlight.current = false;
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
      <div className="form-step-header flex items-start gap-3 border-b border-[var(--kit-border)] pb-5">
        <span className="ticket-form-step-marker grid h-9 w-9 shrink-0 place-items-center text-sm font-bold">01</span>
        <div>
          <h2 className="text-base font-semibold text-[var(--kit-text)]">Parlons de votre besoin</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--kit-text-2)]">Décrivez votre besoin ; le catalogue route automatiquement les demandes reconnues.</p>
        </div>
      </div>
      {error ? <div role="alert" aria-live="assertive" className="rounded-lg border border-[var(--kit-danger)] bg-[var(--kit-danger-soft)] px-4 py-3 text-sm text-[var(--kit-danger-text)]">{error}</div> : null}

      <section className="route-panel rounded-lg kit-callout p-5" aria-labelledby="free-request-title">
        <div className="flex items-center justify-between gap-3"><div><p id="free-request-title" className="ticket-route-kicker text-xs font-bold uppercase tracking-[0.14em]">Saisie libre</p><p className="mt-1 text-xs leading-5 text-[var(--kit-text-2)]">Choisissez un service si vous le connaissez, sinon décrivez librement le besoin.</p></div><span className="ticket-route-badge px-2 py-1 text-xs font-semibold">Routage catalogue</span></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="field-label sm:col-span-2">Besoin demandé<textarea required minLength={3} maxLength={180} value={requestedService} onChange={(event) => { setRequestedService(event.target.value); resetPreview(); }} className="field-control min-h-20" placeholder="Ex. Création d’un compte client" /></label>
          <label className="field-label">Département cible<Combobox required disabled={loadingDepartments} value={targetDepartmentId} onChange={(next) => { setTargetDepartmentId(next); setServiceCatalogItemId(""); resetPreview(); }} placeholder={loadingDepartments ? "Chargement…" : "Choisir un département"} options={[{ value: "", label: loadingDepartments ? "Chargement…" : "Choisir un département" }, ...departments.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` }))]} /></label>
          <label className="field-label">Service catalogue (facultatif)<Combobox disabled={!targetDepartmentId} value={serviceCatalogItemId} onChange={(next) => { setServiceCatalogItemId(next); resetPreview(); }} placeholder="Détection automatique" options={[{ value: "", label: "Détection automatique" }, ...departmentServices.map((service) => ({ value: service.id, label: `${service.name} · ${service.category}` }))]} /></label>
          <label className="field-label">Nature indicative<Combobox value={type} onChange={(next) => { setType(next); resetPreview(); }} options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} /></label>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--kit-text-2)]">Le service sélectionné est routé directement. Sans sélection, le système recherche une correspondance fiable et utilise le triage uniquement en cas de doute.</p>
      </section>

      {targetDepartment ? <section className={`route-panel rounded-lg border p-5 ${selectedService ? "border-[var(--kit-border-strong)] bg-[var(--kit-success-soft)]" : "border-[var(--kit-border-strong)] bg-[var(--kit-warning-soft)]"}`} aria-labelledby="routing-summary-title"><p id="routing-summary-title" className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kit-text)]">Routage prévu</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{selectedService ? <><div><dt className="text-[var(--kit-text-2)]">Service</dt><dd className="font-semibold text-[var(--kit-text)]">{selectedService.name}</dd></div><div><dt className="text-[var(--kit-text-2)]">Catégorie</dt><dd className="font-semibold text-[var(--kit-text)]">{selectedService.category}</dd></div><div><dt className="text-[var(--kit-text-2)]">Destination</dt><dd className="font-semibold text-[var(--kit-text)]">{selectedService.queue.name}</dd></div></> : <div><dt className="text-[var(--kit-text-2)]">Destination si aucun service fiable</dt><dd className="font-semibold text-[var(--kit-text)]">Triage {targetDepartment.code}</dd></div>}<div><dt className="text-[var(--kit-text-2)]">Département</dt><dd className="font-semibold text-[var(--kit-text)]">{targetDepartment.name}</dd></div><div><dt className="text-[var(--kit-text-2)]">Routage</dt><dd className="font-semibold text-[var(--kit-text)]">{selectedService ? "Direct" : "Détection automatique, sinon qualification requise"}</dd></div><div><dt className="text-[var(--kit-text-2)]">Statut initial</dt><dd className="font-semibold text-[var(--kit-text)]">{selectedService ? "Nouveau" : "Nouveau si reconnu, sinon À qualifier"}</dd></div></dl></section> : null}

      <label className="field-label">Objet<input id="title" required minLength={5} maxLength={180} value={title} onChange={(event) => { setTitle(event.target.value); resetPreview(); }} className="field-control" placeholder="Ex. Problème de connexion Wi-Fi" /></label>
      <label className="field-label"><span className="flex items-center justify-between gap-3">Description <span className="font-normal text-xs text-[var(--kit-text-2)]">Minimum 15 caractères</span></span><textarea id="description" required minLength={15} maxLength={20000} value={description} onChange={(event) => { setDescription(event.target.value); resetPreview(); }} className="field-control min-h-40" placeholder="Décrivez le contexte, le message affiché et les impacts constatés." /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">Impact<Combobox value={impact} onChange={(next) => { setImpact(next); resetPreview(); }} options={Object.entries(impactLabels).map(([value, label]) => ({ value, label }))} /></label>
        <label className="field-label">Urgence<Combobox value={urgency} onChange={(next) => { setUrgency(next); resetPreview(); }} options={Object.entries(urgencyLabels).map(([value, label]) => ({ value, label }))} /></label>
      </div>
      <label className="field-label">Échéance légale ou métier <input id="legalDueAt" type="date" value={legalDueAt} onChange={(event) => { setLegalDueAt(event.target.value); resetPreview(); }} className="field-control" /><span className="mt-1 block text-xs font-normal text-[var(--kit-text-2)]">Facultatif. L’urgence reste calculée séparément par la matrice impact × urgence.</span></label>
      {canAttachProductionContext ? <section className="rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface-muted)] p-4"><div><p className="eyebrow">Contexte de production</p><h3 className="mt-1 text-sm font-semibold text-[var(--kit-text)]">Rattacher ce ticket à un dossier ou une mission</h3><p className="mt-1 text-xs leading-5 text-[var(--kit-text-2)]">Facultatif. Les options sont limitées à votre périmètre autorisé et contrôlées à nouveau lors de la création.</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Dossier client<Combobox value={dossierId} onChange={(next) => { setDossierId(next); const selectedMission = missions.find((mission) => mission.id === missionId); if (selectedMission && next && selectedMission.dossier.id !== next) setMissionId(""); resetPreview(); }} placeholder="Aucun dossier" options={[{ value: "", label: "Aucun dossier" }, ...dossiers.map((dossier) => ({ value: dossier.id, label: `${dossier.client.name} · ${dossier.code} · ${dossier.name}` }))]} /></label><label className="field-label">Mission<Combobox value={missionId} onChange={(next) => { const selectedMission = missions.find((mission) => mission.id === next); setMissionId(next); if (selectedMission) setDossierId(selectedMission.dossier.id); resetPreview(); }} placeholder="Aucune mission" options={[{ value: "", label: "Aucune mission" }, ...availableMissions.map((mission) => ({ value: mission.id, label: `${mission.code} · ${mission.name}` }))]} /></label></div></section> : null}
      {selectedService?.allowConfidentialTickets || confidential ? <div>{!selectedService?.allowConfidentialTickets && confidential ? <p role="alert" className="mb-2 text-sm text-[var(--kit-danger-text)]">Le service choisi ne permet pas la confidentialité. Décochez l’option ou choisissez un service éligible.</p> : null}<label className="flex items-start gap-3 rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface-muted)] p-4 text-sm text-[var(--kit-text)]"><input type="checkbox" checked={confidential} onChange={(event) => { setConfidential(event.target.checked); resetPreview(); }} className="mt-0.5 h-4 w-4 accent-[var(--kit-primary)]" /><span><span className="font-semibold">Confidential ticket</span><span className="mt-1 block text-xs leading-5 text-[var(--kit-text-2)]">Make this ticket confidential. Access is initially limited to you and the configured recipient.</span>{confidential && selectedService?.confidentialRecipient ? <span className="mt-2 block font-semibold text-[var(--kit-text)]">Initial access: you and {selectedService.confidentialRecipient.name}{selectedService.confidentialReplacementActive ? ", currently designated as replacement" : ""}.</span> : null}{confidential && selectedService?.allowConfidentialTickets && !selectedService.confidentialRecipient ? <span className="mt-2 block text-[var(--kit-danger-text)]">No valid recipient is currently available. You can keep your data and choose a standard ticket.</span> : null}</span></label></div> : null}
      {preview ? <section className="preview-panel" aria-labelledby="ticket-preview-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Dernière vérification</p><h2 id="ticket-preview-title" className="mt-1 text-lg font-bold text-[var(--kit-text)]">Prévisualisation du ticket</h2></div><span className={`rounded-md px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] ${selectedService ? "bg-[var(--kit-success-soft)] text-[var(--kit-success-text)]" : "bg-[var(--kit-warning-soft)] text-[var(--kit-warning-text)]"}`}>{selectedService ? "Nouveau · routage direct" : "Détection automatique"}</span></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[var(--kit-text-2)]">Besoin</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{requestedService}</dd></div><div><dt className="text-xs text-[var(--kit-text-2)]">Routage</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{selectedService ? `${selectedService.name} · ${selectedService.queue.name}` : `${targetDepartment?.name} · catalogue automatique, triage en repli`}</dd></div><div><dt className="text-xs text-[var(--kit-text-2)]">Nature</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{typeLabels[type] ?? type}</dd></div><div><dt className="text-xs text-[var(--kit-text-2)]">Impact / urgence</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{impactLabels[impact]} · {urgencyLabels[urgency]}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-[var(--kit-text-2)]">Objet</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{title}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-[var(--kit-text-2)]">Description</dt><dd className="mt-1 whitespace-pre-wrap text-[var(--kit-text)]">{description}</dd></div><div><dt className="text-xs text-[var(--kit-text-2)]">Confidentialité</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{confidential ? "Confidential ticket" : "Ticket standard"}</dd></div>{dossierId || missionId ? <div><dt className="text-xs text-[var(--kit-text-2)]">Contexte</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{missions.find((mission) => mission.id === missionId)?.code ?? dossiers.find((dossier) => dossier.id === dossierId)?.code ?? "Rattaché"}</dd></div> : null}</dl></section> : null}
      <div className="form-actions flex flex-col-reverse gap-3 border-t border-[var(--kit-border)] pt-5 sm:flex-row sm:justify-end"><button type="button" disabled={submitting} onClick={() => onCancel ? onCancel() : router.back()} className="button-secondary">Annuler</button>{preview ? <><button type="button" disabled={submitting} onClick={() => setPreview(false)} className="button-secondary">Modifier</button><button type="submit" disabled={submitting || loadingDepartments} aria-busy={submitting} className="button-primary">{submitting ? <><span className="action-spinner" aria-hidden="true" />Création du ticket…</> : "Confirmer et créer"}</button></> : <button type="button" disabled={submitting || loadingDepartments || !canPreview} onClick={() => setPreview(true)} className="button-primary">{loadingDepartments ? "Chargement des départements…" : !requestedService.trim() ? "Décrivez votre besoin" : !targetDepartmentId ? "Choisissez un département" : title.trim().length < 5 ? "Objet : 5 caractères minimum" : description.trim().length < 15 ? "Description : 15 caractères minimum" : "Prévisualiser le ticket"}</button>}</div>
    </form>
  );
}

export function NewTicketForm({ onCancel, onCreated, simplified = false }: { onCancel?: () => void; onCreated?: (ticketId: string) => void; simplified?: boolean } = {}) {
  return simplified
    ? <V1TicketForm onCancel={onCancel} onCreated={onCreated} />
    : <FullTicketForm onCancel={onCancel} onCreated={onCreated} />;
}
