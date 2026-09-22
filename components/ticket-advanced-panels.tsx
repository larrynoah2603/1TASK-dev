"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";
import { TicketSidePanel } from "@/components/ticket-side-panel";

const IMPACTS = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyen" },
  { value: "HIGH", label: "Élevé" },
  { value: "CRITICAL", label: "Critique" },
];
const URGENCIES = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Élevée" },
  { value: "CRITICAL", label: "Critique" },
];
const PRIORITIES = [
  { value: "LOW", label: "Basse" },
  { value: "MEDIUM", label: "Normale" },
  { value: "HIGH", label: "Haute" },
  { value: "CRITICAL", label: "Critique" },
];
const LINK_TYPES = [
  { value: "DUPLICATE", label: "Doublon de" },
  { value: "DEPENDS_ON", label: "Dépend de" },
  { value: "BLOCKS", label: "Bloque" },
  { value: "PARENT", label: "Parent de" },
  { value: "CHILD", label: "Enfant de" },
];

type TicketRef = { id: string; reference: string; title: string; status: string; priority: string };
type TicketLink = {
  id: string;
  type: string;
  reason: string | null;
  createdAt: string;
  fromTicket: TicketRef;
  toTicket: TicketRef;
};
type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  messageId: string | null;
  uploadedBy: { id: string; name: string };
};

type Props = {
  ticketId: string;
  impact: string;
  urgency: string;
  priority: string;
  legalDueAt: string | null;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  canQualify: boolean;
  canManageSla: boolean;
  canUpload: boolean;
  canLink: boolean;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Non définie";
}

function ticketLabel(ticket: TicketRef) {
  return `${ticket.reference} · ${ticket.title}`;
}

export function TicketAdvancedPanels(props: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [impact, setImpact] = useState(props.impact);
  const [urgency, setUrgency] = useState(props.urgency);
  const [priority, setPriority] = useState(props.priority);
  const [legalDueAt, setLegalDueAt] = useState(props.legalDueAt ? props.legalDueAt.slice(0, 10) : "");
  const [qualificationReason, setQualificationReason] = useState("");
  const [addedMinutes, setAddedMinutes] = useState("60");
  const [slaReason, setSlaReason] = useState("");
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState<TicketRef[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRef | null>(null);
  const [linkType, setLinkType] = useState("DUPLICATE");
  const [linkReason, setLinkReason] = useState("");
  const [links, setLinks] = useState<TicketLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; run: () => void } | null>(null);

  const [linksLoading, setLinksLoading] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const loadLinks = useCallback(async (force = false) => {
    if ((linksLoaded && !force) || linksLoading) return;
    setLinksLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tickets/${props.ticketId}/links`, { cache: "no-store" });
      if (!response.ok) throw new Error("links-load-failed");
      setLinks((await response.json()).links ?? []);
      setLinksLoaded(true);
    } catch {
      setError("Les relations du ticket n’ont pas pu être chargées.");
    } finally {
      setLinksLoading(false);
    }
  }, [linksLoaded, linksLoading, props.ticketId]);

  const loadAttachments = useCallback(async () => {
    if (attachmentsLoaded || attachmentsLoading) return;
    setAttachmentsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tickets/${props.ticketId}/attachments`, { cache: "no-store" });
      if (!response.ok) throw new Error("attachments-load-failed");
      setAttachments((await response.json()) ?? []);
      setAttachmentsLoaded(true);
    } catch {
      setError("Les pièces jointes n’ont pas pu être chargées.");
    } finally {
      setAttachmentsLoading(false);
    }
  }, [attachmentsLoaded, attachmentsLoading, props.ticketId]);

  async function searchTickets(value: string) {
    setLinkQuery(value);
    setSelectedTicket(null);
    if (value.trim().length < 2) {
      setLinkResults([]);
      return;
    }
    const response = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`, { cache: "no-store" });
    if (response.ok) setLinkResults((await response.json()).tickets ?? []);
  }

  async function postJson(
    path: string,
    payload: unknown,
    success: string,
    key: string,
    options: { refresh?: boolean } = {},
  ) {
    setBusy(key);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Action refusée.");
        toast(data.error ?? "Action refusée.", "error");
        return;
      }
      toast(success);
      if (key === "link") {
        setSelectedTicket(null);
        setLinkQuery("");
        await loadLinks(true);
      }
      if (options.refresh) router.refresh();
    } catch {
      setError("L’action n’a pas pu être envoyée.");
      toast("L’action n’a pas pu être envoyée.", "error");
    } finally {
      setBusy("");
    }
  }

  function submitQualification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmAction({
      title: "Confirmer la qualification",
      description: "La priorité et les informations de qualification seront recalculées et historisées.",
      run: () => {
        void (async () => {
          setBusy("qualification");
          setError("");
          try {
            const response = await fetch(`/api/tickets/${props.ticketId}/qualification`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ impact, urgency, legalDueAt: legalDueAt ? new Date(`${legalDueAt}T00:00:00.000Z`).toISOString() : null, priority: priority || undefined, reason: qualificationReason }),
            });
            const data = await response.json();
            if (!response.ok) {
              setError(data.error ?? "Qualification refusée.");
              toast(data.error ?? "Qualification refusée.", "error");
              return;
            }
            setImpact(data.impact ?? impact);
            setUrgency(data.urgency ?? urgency);
            setPriority(data.priority ?? priority);
            setLegalDueAt(data.legalDueAt ? String(data.legalDueAt).slice(0, 10) : legalDueAt);
            setQualificationReason("");
            toast("Qualification enregistrée.");
            router.refresh();
          } catch {
            setError("La qualification n’a pas pu être enregistrée.");
            toast("La qualification n’a pas pu être enregistrée.", "error");
          } finally {
            setBusy("");
          }
        })();
      },
    });
  }

  function submitSlaException(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmAction({
      title: "Confirmer la dérogation SLA",
      description: "Les échéances de première réponse et de résolution seront prolongées et l’action sera auditée.",
      run: () => void postJson(`/api/tickets/${props.ticketId}/sla-exception`, { addedMinutes: Number(addedMinutes), reason: slaReason }, "Dérogation SLA enregistrée.", "sla", { refresh: true }),
    });
  }

  function submitLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) return;
    void postJson(`/api/tickets/${props.ticketId}/links`, { toTicketId: selectedTicket.id, type: linkType, reason: linkReason || undefined }, "Lien ticket créé.", "link");
  }

  async function uploadAttachment(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier dépasse la limite de 10 Mo.");
      return;
    }
    setBusy("attachment");
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`/api/tickets/${props.ticketId}/attachments`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Upload refusé.");
        toast(data.error ?? "Upload refusé.", "error");
        return;
      }
      setAttachments((items) => [...items, data]);
      setAttachmentsLoaded(true);
      toast("Pièce jointe ajoutée.");
    } catch {
      setError("La pièce jointe n’a pas pu être envoyée.");
      toast("La pièce jointe n’a pas pu être envoyée.", "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}

      {props.canQualify ? (
        <TicketSidePanel title="Qualification" subtitle="Impact, urgence et priorité" defaultOpen>
          <section className="panel p-5">
          <p className="eyebrow">Qualification</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Impact, urgence et priorité</h2>
          <form onSubmit={submitQualification} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field-label">Impact<Combobox value={impact} onChange={setImpact} options={IMPACTS} /></label>
              <label className="field-label">Urgence<Combobox value={urgency} onChange={setUrgency} options={URGENCIES} /></label>
            </div>
            <label className="field-label">Priorité calculée ou surcharge<Combobox value={priority} onChange={setPriority} options={[{ value: "", label: "Calcul automatique" }, ...PRIORITIES]} /></label>
            <label className="field-label">Échéance légale<input type="date" value={legalDueAt} onChange={(event) => setLegalDueAt(event.target.value)} className="field-control font-normal" /></label>
            <label className="field-label">Justification obligatoire<textarea required minLength={10} maxLength={2000} value={qualificationReason} onChange={(event) => setQualificationReason(event.target.value)} className="field-control min-h-20 font-normal" placeholder="Expliquez la qualification…" /></label>
            <button disabled={busy === "qualification"} className="button-primary w-full">{busy === "qualification" ? "Enregistrement…" : "Enregistrer la qualification"}</button>
            </form>
          </section>
        </TicketSidePanel>
      ) : null}

      {props.canManageSla ? (
        <TicketSidePanel title="SLA" subtitle="Échéances et dérogation contrôlée">
          <section className="panel p-5">
          <p className="eyebrow">SLA</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Dérogation contrôlée</h2>
          <dl className="mt-3 grid gap-2 text-xs text-slate-600"><div className="flex justify-between gap-3"><dt>Première réponse</dt><dd className="font-semibold">{formatDate(props.firstResponseDueAt)}</dd></div><div className="flex justify-between gap-3"><dt>Résolution</dt><dd className="font-semibold">{formatDate(props.resolutionDueAt)}</dd></div></dl>
          <form onSubmit={submitSlaException} className="mt-4 space-y-3">
            <label className="field-label">Minutes ajoutées<input required type="number" min={1} max={2000000} value={addedMinutes} onChange={(event) => setAddedMinutes(event.target.value)} className="field-control font-normal" /></label>
            <label className="field-label">Motif obligatoire<textarea required minLength={10} maxLength={2000} value={slaReason} onChange={(event) => setSlaReason(event.target.value)} className="field-control min-h-20 font-normal" placeholder="Motif de la dérogation…" /></label>
            <button disabled={busy === "sla"} className="button-secondary w-full">{busy === "sla" ? "Enregistrement…" : "Accorder la dérogation"}</button>
            </form>
          </section>
        </TicketSidePanel>
      ) : null}

      <TicketSidePanel title="Relations" subtitle="Tickets liés" onOpen={() => void loadLinks()}>
        <section className="panel p-5">
        <p className="eyebrow">Relations</p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">Tickets liés</h2>
        {props.canLink ? <form onSubmit={submitLink} className="mt-4 space-y-3">
          <label className="field-label">Rechercher un ticket cible<input value={linkQuery} onChange={(event) => void searchTickets(event.target.value)} className="field-control font-normal" placeholder="Référence ou titre…" /></label>
          {linkResults.length ? <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">{linkResults.map((ticket) => <button type="button" key={ticket.id} onClick={() => { setSelectedTicket(ticket); setLinkQuery(ticketLabel(ticket)); setLinkResults([]); }} className="block w-full rounded-md px-2 py-2 text-left text-xs hover:bg-slate-50"><strong>{ticket.reference}</strong> · {ticket.title}</button>)}</div> : null}
          {selectedTicket ? <p className="rounded-md bg-[#f7f7ff] px-2 py-2 text-xs operational-link">Cible : {ticketLabel(selectedTicket)}</p> : null}
          <label className="field-label">Type de relation<Combobox value={linkType} onChange={setLinkType} options={LINK_TYPES} /></label>
          <label className="field-label">Motif facultatif<input value={linkReason} onChange={(event) => setLinkReason(event.target.value)} className="field-control font-normal" /></label>
          <button disabled={!selectedTicket || busy === "link"} className="button-secondary w-full">{busy === "link" ? "Création…" : "Créer le lien"}</button>
        </form> : null}
          <div className="mt-4 space-y-2">{linksLoading ? <p className="text-xs text-slate-500">Chargement des relations…</p> : null}{links.map((link) => { const other = link.fromTicket.id === props.ticketId ? link.toTicket : link.fromTicket; return <div key={link.id} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"><p className="font-semibold text-slate-800">{LINK_TYPES.find((item) => item.value === link.type)?.label ?? link.type} · {other.reference}</p><p className="mt-1 text-slate-500">{other.title} · {formatDate(link.createdAt)}</p>{link.reason ? <p className="mt-1 text-slate-500">Motif : {link.reason}</p> : null}</div>; })}{!links.length ? <p className="text-xs text-slate-500">Aucun lien visible.</p> : null}</div>
        </section>
      </TicketSidePanel>

      <TicketSidePanel title="Fichiers" subtitle="Pièces jointes" onOpen={() => void loadAttachments()}>
        <section className="panel p-5">
        <p className="eyebrow">Fichiers</p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">Pièces jointes</h2>
        {props.canUpload ? <label className="mt-4 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#b9b9eb] bg-[#f7f7ff] px-3 py-4 text-xs font-semibold operational-link hover:bg-[#eeeeff]">{busy === "attachment" ? "Envoi…" : "Ajouter un fichier · 10 Mo maximum"}<input type="file" onChange={(event) => void uploadAttachment(event)} disabled={busy === "attachment"} className="sr-only" /></label> : null}
          <div className="mt-4 space-y-2">{attachmentsLoading ? <p className="text-xs text-slate-500">Chargement des pièces jointes…</p> : null}{attachments.map((attachment) => <a key={attachment.id} href={`/api/tickets/${props.ticketId}/attachments/${attachment.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs hover:bg-slate-100"><span className="min-w-0 truncate font-semibold text-slate-800">{attachment.fileName}<span className="ml-2 font-normal text-slate-400">{formatBytes(attachment.sizeBytes)}</span></span><span className="shrink-0 text-slate-500">{attachment.uploadedBy.name}</span></a>)}{!attachments.length ? <p className="text-xs text-slate-500">Aucune pièce jointe visible.</p> : null}</div>
        </section>
      </TicketSidePanel>

      <ConfirmDialog open={Boolean(confirmAction)} title={confirmAction?.title ?? "Confirmer"} description={confirmAction?.description ?? ""} confirmLabel="Confirmer" busy={Boolean(busy)} onCancel={() => setConfirmAction(null)} onConfirm={() => { const action = confirmAction; setConfirmAction(null); action?.run(); }} />
    </div>
  );
}
