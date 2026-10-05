"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type Service = { id: string; name: string; category: string; queue: { name: string; department: { name: string } } };
const token = () => `web-${crypto.randomUUID().replace(/[^A-Za-z0-9_-]/g, "")}`;

export function V1TicketForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCatalogItemId, setServiceCatalogItemId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const creationIdempotencyToken = useRef(token()).current;
  const inFlight = useRef(false);

  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<Service[]> : [])
      .then(setServices)
      .catch(() => setError("Le catalogue n’a pas pu être chargé. Vous pouvez néanmoins décrire votre demande."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ creationIdempotencyToken, serviceCatalogItemId: serviceCatalogItemId || undefined, title, description }),
      });
      const data = await response.json() as { id?: string; reference?: string; error?: string };
      if (!response.ok || !data.id) {
        const message = data.error ?? "La création a échoué.";
        setError(message);
        toast(message, "error");
        return;
      }
      toast({ kind: "success", title: "Ticket créé", description: "Votre demande a été transmise.", metadata: data.reference, action: { label: "Voir le ticket", href: `/tickets/${data.id}` } });
      router.push(`/tickets/${data.id}`);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          if (attempt) await new Promise((resolve) => window.setTimeout(resolve, 1_500));
          const status = await fetch(`/api/tickets/creation-status?token=${encodeURIComponent(creationIdempotencyToken)}`, { cache: "no-store" }).catch(() => null);
          if (!status?.ok) continue;
          const data = await status.json() as { ticket: { id: string; reference?: string } | null };
          if (data.ticket) {
            toast({ kind: "success", title: "Ticket créé", description: "La création a été confirmée après vérification.", metadata: data.ticket.reference, action: { label: "Voir le ticket", href: `/tickets/${data.ticket.id}` } });
            router.push(`/tickets/${data.ticket.id}`);
            return;
          }
        }
      }
      const message = "La création n’a pas pu être envoyée. Réessayez : l’identifiant conservé empêchera tout doublon.";
      setError(message);
      toast(message, "error");
    } finally {
      window.clearTimeout(timeoutId);
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return <form onSubmit={submit} aria-busy={submitting} className="ticket-composer ticket-composer-industrial panel max-w-4xl space-y-6 p-5 sm:p-7 md:p-8">
    <div className="form-step-header border-b border-slate-100 pb-5"><h2 className="text-base font-semibold text-slate-950">Décrivez votre demande</h2><p className="mt-1 text-xs leading-5 text-slate-500">Le service est facultatif. Sans correspondance fiable, la demande sera transmise au triage.</p></div>
    {error ? <div role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
    <label className="field-label">Objet<input required minLength={5} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className="field-control" /></label>
    <label className="field-label">Description<textarea required minLength={15} maxLength={20_000} value={description} onChange={(event) => setDescription(event.target.value)} className="field-control min-h-40" /></label>
    <label className="field-label">Service <span className="font-normal text-slate-400">(facultatif)</span><Combobox value={serviceCatalogItemId} onChange={setServiceCatalogItemId} options={[{ value: "", label: "Détection automatique" }, ...services.map((service) => ({ value: service.id, label: `${service.queue.department.name} — ${service.name} · ${service.queue.name}` }))]} /></label>
    <div className="form-actions flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" disabled={submitting} onClick={() => onCancel ? onCancel() : router.back()} className="button-secondary">Annuler</button><button type="submit" disabled={submitting || title.trim().length < 5 || description.trim().length < 15} className="button-primary">{submitting ? "Création du ticket…" : "Créer le ticket"}</button></div>
  </form>;
}
