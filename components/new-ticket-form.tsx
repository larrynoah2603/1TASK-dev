"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { Combobox } from "@/components/combobox";

type ProductionDossier = { id: string; code: string; name: string; client: { id: string; code: string; name: string } };
type ProductionMission = { id: string; code: string; name: string; status: string; dossier: { id: string; code: string; name: string; client: { id: string; code: string; name: string } } };

type CatalogItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ticketType: string;
  category: string;
  priorityDefault: string;
  queue: { name: string; department: { name: string } };
  sla: {
    code: string;
    name: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
  } | null;
  escalationRules: { thresholdPercent: number; targetRole: string }[];
};

const typeLabels: Record<string, string> = {
  INCIDENT: "Incident",
  SERVICE_REQUEST: "Demande de service",
  QUESTION: "Question",
  ACCESS_REQUEST: "Demande d’accès",
  OTHER: "Autre",
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

const priorityLabels: Record<string, string> = {
  LOW: "Basse",
  MEDIUM: "Normale",
  HIGH: "Haute",
  CRITICAL: "Critique",
};

export function NewTicketForm({ onCancel }: { onCancel?: () => void } = {}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [serviceId, setServiceId] = useState("");
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
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [preview, setPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

    fetch("/api/catalog", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog-error");
        return response.json() as Promise<CatalogItem[]>;
      })
      .then(setCatalog)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          setError("Le catalogue met trop de temps à répondre. Réessayez après le redémarrage de l’application.");
          return;
        }
        setError("Impossible de charger le catalogue de services.");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoadingCatalog(false);
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

  const selectedService = catalog.find((item) => item.id === serviceId);
  const availableMissions = missionId || !dossierId ? missions : missions.filter((mission) => mission.dossier.id === dossierId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceCatalogItemId: serviceId, title, description, confidential, impact, urgency, legalDueAt: legalDueAt ? new Date(`${legalDueAt}T23:59:59`).toISOString() : null, dossierId: dossierId || null, missionId: missionId || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "La création a échoué.");
        toast(data.error ?? "La création a échoué.", "error");
        return;
      }
      toast("Ticket créé avec succès.");
      router.push(`/tickets/${data.id}`);
    } catch {
      setError("La création n’a pas pu être envoyée.");
      toast("La création n’a pas pu être envoyée.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const canPreview = Boolean(serviceId && title.trim().length >= 5 && description.trim().length >= 15);
  const resetPreview = () => setPreview(false);

  return (
    <form onSubmit={submit} aria-busy={submitting || loadingCatalog} className="ticket-composer panel max-w-4xl space-y-6 p-5 sm:p-7 md:p-8">
      <ol className="form-progress" aria-label="Étapes de création du ticket">
        <li className={!preview ? "form-progress-active" : "form-progress-complete"}><span>01</span><strong>Décrire</strong></li>
        <li className={preview ? "form-progress-active" : ""}><span>02</span><strong>Vérifier</strong></li>
      </ol>
      <div className="form-step-header flex items-start gap-3 border-b border-slate-100 pb-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f0f0ff] text-sm font-bold text-[#4c4dba]">01</span>
        <div>
          <h2 className="text-base font-semibold text-slate-950">Parlons de votre besoin</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Les informations ci-dessous permettent à l’équipe de vous répondre rapidement.</p>
        </div>
      </div>
      {error ? <div role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div>
        <label htmlFor="service" className="field-label">Service demandé
        <Combobox id="service" required disabled={loadingCatalog} value={serviceId} onChange={(next) => { setServiceId(next); resetPreview(); }} placeholder={loadingCatalog ? "Chargement du catalogue…" : "Sélectionner un service du catalogue"} options={[{ value: "", label: loadingCatalog ? "Chargement du catalogue…" : "Sélectionner un service du catalogue" }, ...catalog.map((item) => ({ value: item.id, label: `${item.name} — ${item.queue.department.name} / ${item.queue.name}` }))]} />
        </label>
        <p className="mt-2 text-xs leading-5 text-slate-500">Le département demandeur vient de votre profil applicatif validé. La file, l’équipe, la nature, la catégorie, la priorité, le SLA et l’escalade sont déterminés par ce service.</p>
      </div>

      {selectedService ? (
        <section className="route-panel rounded-lg border border-[#dfe1f9] bg-[#f7f7ff] p-5" aria-labelledby="routing-summary-title">
          <div className="flex items-center justify-between gap-3"><p id="routing-summary-title" className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4c4dba]">Routage déterminé par le catalogue</p><span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-[#4c4dba]">Automatique</span></div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Département destinataire</dt><dd className="font-semibold text-slate-800">{selectedService.queue.department.name}</dd></div>
            <div><dt className="text-slate-500">File opérationnelle</dt><dd className="font-semibold text-slate-800">{selectedService.queue.name}</dd></div>
            <div><dt className="text-slate-500">Nature</dt><dd className="font-semibold text-slate-800">{typeLabels[selectedService.ticketType] ?? selectedService.ticketType}</dd></div>
            <div><dt className="text-slate-500">Catégorie</dt><dd className="font-semibold text-slate-800">{selectedService.category}</dd></div>
            <div><dt className="text-slate-500">Priorité par défaut</dt><dd className="font-semibold text-slate-800">{priorityLabels[selectedService.priorityDefault] ?? selectedService.priorityDefault}</dd></div>
            <div><dt className="text-slate-500">SLA</dt><dd className="font-semibold text-slate-800">{selectedService.sla?.name ?? "Non configuré"}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-slate-600">
            Escalade : {selectedService.escalationRules.length
              ? selectedService.escalationRules.map((rule) => `${rule.thresholdPercent} %`).join(" · ")
              : "règles de la file applicables"}
          </p>
        </section>
      ) : null}

      <label className="field-label">Objet<input id="title" required minLength={5} maxLength={180} value={title} onChange={(event) => { setTitle(event.target.value); resetPreview(); }} className="field-control" placeholder="Ex. Problème de connexion Wi-Fi" /></label>
      <label className="field-label"><span className="flex items-center justify-between gap-3">Description <span className="font-normal text-[11px] text-slate-400">Minimum 15 caractères</span></span><textarea id="description" required minLength={15} maxLength={20000} value={description} onChange={(event) => { setDescription(event.target.value); resetPreview(); }} className="field-control min-h-40" placeholder="Décrivez le contexte, le message affiché et les impacts constatés." /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">Impact<Combobox value={impact} onChange={(next) => { setImpact(next); resetPreview(); }} options={Object.entries(impactLabels).map(([value, label]) => ({ value, label }))} /></label>
        <label className="field-label">Urgence<Combobox value={urgency} onChange={(next) => { setUrgency(next); resetPreview(); }} options={Object.entries(urgencyLabels).map(([value, label]) => ({ value, label }))} /></label>
      </div>
      <label className="field-label">Échéance légale ou métier <input id="legalDueAt" type="date" value={legalDueAt} onChange={(event) => { setLegalDueAt(event.target.value); resetPreview(); }} className="field-control" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Facultatif. L’urgence reste calculée séparément par la matrice impact × urgence.</span></label>
      {canAttachProductionContext ? <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"><div><p className="eyebrow">Contexte de production</p><h3 className="mt-1 text-sm font-semibold text-slate-900">Rattacher ce ticket à un dossier ou une mission</h3><p className="mt-1 text-xs leading-5 text-slate-500">Facultatif. Les options sont limitées à votre périmètre autorisé et contrôlées à nouveau lors de la création.</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Dossier client<Combobox value={dossierId} onChange={(next) => { setDossierId(next); const selectedMission = missions.find((mission) => mission.id === missionId); if (selectedMission && next && selectedMission.dossier.id !== next) setMissionId(""); resetPreview(); }} placeholder="Aucun dossier" options={[{ value: "", label: "Aucun dossier" }, ...dossiers.map((dossier) => ({ value: dossier.id, label: `${dossier.client.name} · ${dossier.code} · ${dossier.name}` }))]} /></label><label className="field-label">Mission<Combobox value={missionId} onChange={(next) => { const selectedMission = missions.find((mission) => mission.id === next); setMissionId(next); if (selectedMission) setDossierId(selectedMission.dossier.id); resetPreview(); }} placeholder="Aucune mission" options={[{ value: "", label: "Aucune mission" }, ...availableMissions.map((mission) => ({ value: mission.id, label: `${mission.code} · ${mission.name}` }))]} /></label></div></section> : null}
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 transition hover:border-[#cfd0f0]"><input type="checkbox" checked={confidential} onChange={(event) => { setConfidential(event.target.checked); resetPreview(); }} className="mt-0.5 h-4 w-4 accent-[#5b5bd6]" /><span><span className="font-semibold">Dossier confidentiel</span><span className="mt-1 block text-xs leading-5 text-slate-500">L’accès sera limité aux personnes habilitées et nominativement autorisées.</span></span></label>
      {preview ? <section className="preview-panel" aria-labelledby="ticket-preview-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Dernière vérification</p><h2 id="ticket-preview-title" className="mt-1 text-lg font-bold text-slate-900">Prévisualisation du ticket</h2></div><span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">Prêt à envoyer</span></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Service</dt><dd className="mt-1 font-semibold text-slate-900">{selectedService?.name}</dd></div><div><dt className="text-xs text-slate-500">Routage</dt><dd className="mt-1 font-semibold text-slate-900">{selectedService?.queue.department.name} · {selectedService?.queue.name}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-500">Objet</dt><dd className="mt-1 font-semibold text-slate-900">{title}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-500">Description</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{description}</dd></div><div><dt className="text-xs text-slate-500">Impact / urgence</dt><dd className="mt-1 font-semibold text-slate-900">{impactLabels[impact]} · {urgencyLabels[urgency]}</dd></div><div><dt className="text-xs text-slate-500">SLA</dt><dd className="mt-1 font-semibold text-slate-900">{selectedService?.sla?.name ?? "Non configuré"}</dd></div><div><dt className="text-xs text-slate-500">Confidentialité</dt><dd className="mt-1 font-semibold text-slate-900">{confidential ? "Dossier confidentiel" : "Dossier standard"}</dd></div>{dossierId || missionId ? <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Contexte de production</dt><dd className="mt-1 font-semibold text-slate-900">{missions.find((mission) => mission.id === missionId)?.code ?? dossiers.find((dossier) => dossier.id === dossierId)?.code ?? "Rattaché"}</dd></div> : null}</dl></section> : null}
      <div className="form-actions flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => onCancel ? onCancel() : router.back()} className="button-secondary">Annuler</button>{preview ? <><button type="button" onClick={() => setPreview(false)} className="button-secondary">Modifier</button><button type="submit" disabled={submitting || loadingCatalog} className="button-primary">{submitting ? "Création…" : "Confirmer et créer"}</button></> : <button type="button" disabled={submitting || loadingCatalog || !canPreview} onClick={() => setPreview(true)} className="button-primary">{loadingCatalog ? "Chargement du catalogue…" : !serviceId ? "Sélectionnez un service" : title.trim().length < 5 ? "Objet : 5 caractères minimum" : description.trim().length < 15 ? "Description : 15 caractères minimum" : "Prévisualiser le ticket"}</button>}</div>
    </form>
  );
}
