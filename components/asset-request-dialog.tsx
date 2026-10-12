"use client";

import { useId, useState } from "react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/toast-provider";

const assetTypes = [
  ["COMPUTER", "Ordinateur"],
  ["PHONE", "Téléphone"],
  ["ACCESSORY", "Accessoire"],
  ["OTHER", "Autre"],
] as const;

type RequesterAssetType = (typeof assetTypes)[number][0];
type Availability = Record<RequesterAssetType, number>;

const emptyAvailability: Availability = {
  COMPUTER: 0,
  PHONE: 0,
  ACCESSORY: 0,
  OTHER: 0,
};

export function AssetRequestDialog({
  compact = false,
  availability = emptyAvailability,
}: {
  compact?: boolean;
  availability?: Availability;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const dialogRef = useDialogFocus({ open, onClose: () => setOpen(false), closeOnEscape: !submitting });
  const [assetType, setAssetType] = useState<RequesterAssetType>("COMPUTER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableCount = availability[assetType] ?? 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/asset-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: form.get("assetType"),
          reason: form.get("reason"),
          priority: form.get("priority"),
          comment: form.get("comment") || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error ?? "La demande n’a pas pu être envoyée.";
        setError(message);
        toast(message, "error");
        return;
      }
      toast({
        kind: "success",
        title: "Demande envoyée",
        description: availableCount > 0
          ? "La demande a été transmise pour validation et attribution selon l’inventaire disponible."
          : "La demande a été transmise pour validation. Elle pourra rester en attente d’attribution si le stock est indisponible.",
      });
      setOpen(false);
      router.refresh();
    } catch {
      const message = "Le service est momentanément indisponible. Réessayez dans quelques instants.";
      setError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <button
      type="button"
      className={compact ? "button-secondary" : "button-primary"}
      onClick={() => setOpen(true)}
    >
      <Icon name="plus" /> Demander un actif
    </button>
    {open ? (
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <section className="modal-panel asset-request-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
          <header className="asset-form-header">
            <div>
              <p className="eyebrow">Nouvelle demande</p>
              <h2 id={titleId}>Demander un actif</h2>
              <p>Précisez votre besoin. L’administrateur fonctionnel valide chaque demande et attribue un actif depuis l’inventaire.</p>
            </div>
            <button type="button" className="button-ghost" aria-label="Fermer" onClick={() => setOpen(false)}>
              <Icon name="x" />
            </button>
          </header>
          <form onSubmit={submit}>
            {error ? <div className="form-error" role="alert"><Icon name="alertCircle" />{error}</div> : null}
            <fieldset className="form-section">
              <legend>Informations générales</legend>
              <p className="form-section-help">Le modèle exact n’est jamais choisi par le demandeur : il dépend de l’inventaire disponible au moment de l’attribution.</p>
              <div className="form-grid">
                <label className="field-label">
                  Type d’actif demandé
                  <select
                    className="field-control"
                    name="assetType"
                    required
                    value={assetType}
                    onChange={(event) => setAssetType(event.target.value as RequesterAssetType)}
                  >
                    {assetTypes.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label} — {availability[value] ?? 0} disponible{(availability[value] ?? 0) > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                  <span className="field-help">
                    {availableCount > 0
                      ? `${availableCount} actif${availableCount > 1 ? "s" : ""} disponible${availableCount > 1 ? "s" : ""} actuellement. L’administrateur choisira l’équipement exact.`
                      : "Aucun stock disponible actuellement. Vous pouvez quand même envoyer la demande : elle pourra être approuvée en attente d’attribution."}
                  </span>
                </label>
                <label className="field-label">
                  Priorité
                  <select className="field-control" name="priority" required defaultValue="MEDIUM">
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Normale</option>
                    <option value="HIGH">Haute</option>
                    <option value="CRITICAL">Critique</option>
                  </select>
                  <span className="field-help">Réservez « Critique » aux besoins bloquants.</span>
                </label>
              </div>
            </fieldset>
            <fieldset className="form-section">
              <legend>Contexte de la demande</legend>
              <p className="form-section-help">Ces informations sont transmises à l’administrateur fonctionnel.</p>
              <label className="field-label">
                Motif de demande
                <textarea
                  className="field-control"
                  name="reason"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  placeholder="Ex. Mon ordinateur ne permet plus d’exécuter les outils nécessaires…"
                />
                <span className="field-help">10 caractères minimum. Décrivez l’impact sur votre activité.</span>
              </label>
              <label className="field-label">
                Commentaire <span className="field-optional">Optionnel</span>
                <textarea
                  className="field-control"
                  name="comment"
                  maxLength={2000}
                  rows={3}
                  placeholder="Contraintes, référence ou information complémentaire"
                />
              </label>
            </fieldset>
            <footer className="form-actions">
              <button type="button" className="button-secondary" disabled={submitting} onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="button-primary" disabled={submitting} aria-busy={submitting}>
                {submitting ? "Envoi…" : "Envoyer la demande"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    ) : null}
  </>;
}
