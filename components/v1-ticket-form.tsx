"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type Service = { id: string; name: string; category: string; queue: { name: string; department: { name: string } } };
const token = () => `web-${crypto.randomUUID().replace(/[^A-Za-z0-9_-]/g, "")}`;

export function V1TicketForm({ onCancel, onCreated }: { onCancel?: () => void; onCreated?: (ticketId: string) => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const requestSectionTitleId = useId();
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
      onCreated?.(data.id);
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
            onCreated?.(data.ticket.id);
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

  const selectedService = services.find((service) => service.id === serviceCatalogItemId);
  const titleValid = title.trim().length >= 5;
  const descriptionValid = description.trim().length >= 15;

  return (
    <form onSubmit={submit} aria-busy={submitting} className="ticket-composer v1-ticket-form">
      <section className="v1-ticket-form-section" aria-labelledby={requestSectionTitleId}>
        <div className="v1-ticket-form-section-heading">
          <div>
            <h2 id={requestSectionTitleId}>Votre demande</h2>
            <p>Expliquez simplement ce dont vous avez besoin. 1TASK se charge du routage.</p>
          </div>
          <span className="v1-ticket-required-note"><span aria-hidden="true">*</span> Champs obligatoires</span>
        </div>

        {error ? (
          <div role="alert" aria-live="assertive" className="v1-ticket-form-alert">
            {error}
          </div>
        ) : null}

        <div className="v1-ticket-fields">
          <label className="v1-ticket-field">
            <span className="v1-ticket-field-label">Objet <span className="v1-ticket-required" aria-hidden="true">*</span></span>
            <input
              required
              minLength={5}
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="field-control v1-ticket-input"
              placeholder="Ex. Impossible d’accéder au VPN"
              autoComplete="off"
            />
            <span className="v1-ticket-field-help">Résumez le problème ou la demande en une phrase.</span>
          </label>

          <label className="v1-ticket-field">
            <span className="v1-ticket-field-label">Description <span className="v1-ticket-required" aria-hidden="true">*</span></span>
            <textarea
              required
              minLength={15}
              maxLength={20_000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="field-control v1-ticket-textarea"
              placeholder="Décrivez ce qui se passe, depuis quand, et ce que cela vous empêche de faire."
            />
            <span className="v1-ticket-field-help">Plus le contexte est précis, plus le traitement sera rapide.</span>
          </label>

          <div className="v1-ticket-service-block">
            <div className="v1-ticket-service-heading">
              <div>
                <span className="v1-ticket-field-label">Service</span>
                <span className="v1-ticket-optional">Facultatif</span>
              </div>
              <span className="v1-ticket-auto-badge">Automatique recommandé</span>
            </div>
            <Combobox
              ariaLabel="Service"
              value={serviceCatalogItemId}
              onChange={setServiceCatalogItemId}
              options={[
                { value: "", label: "Détection automatique — recommandée" },
                ...services.map((service) => ({
                  value: service.id,
                  label: `${service.queue.department.name} — ${service.name} · ${service.queue.name}`,
                })),
              ]}
            />
            {selectedService ? (
              <p className="v1-ticket-service-help" role="status">
                <strong>Destination probable :</strong> {selectedService.queue.department.name} · {selectedService.queue.name}
              </p>
            ) : null}
            <p className="v1-ticket-service-help">
              Laissez la détection automatique si vous ne savez pas quel service choisir. 1TASK recherchera une correspondance fiable et transmettra la demande au triage en cas de doute.
            </p>
          </div>
        </div>
      </section>

      <footer className="v1-ticket-form-actions">
        <button
          type="button"
          disabled={submitting}
          onClick={() => onCancel ? onCancel() : router.back()}
          className="button-secondary"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting || !titleValid || !descriptionValid}
          className="button-primary v1-ticket-submit"
        >
          {submitting ? "Création du ticket…" : "Créer le ticket"}
        </button>
      </footer>
    </form>
  );
}
