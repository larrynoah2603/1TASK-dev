"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/toast-provider";

const assetTypes = [
  ["COMPUTER", "Ordinateur"], ["PHONE", "Téléphone"], ["ACCESSORY", "Accessoire"], ["OTHER", "Autre"],
] as const;

export function AssetRequestDialog({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/asset-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetType: form.get("assetType"), reason: form.get("reason"), priority: form.get("priority"), comment: form.get("comment") || null }) });
      const data = await response.json();
      if (!response.ok) { const message = data.error ?? "La demande n’a pas pu être envoyée."; setError(message); toast(message, "error"); return; }
      toast({ kind: "success", title: "Demande envoyée", description: "La demande d’actif a été transmise pour validation." });
      setOpen(false); router.refresh();
    } catch { const message = "Le service est momentanément indisponible. Réessayez dans quelques instants."; setError(message); toast(message, "error"); }
    finally { setSubmitting(false); }
  }

  return <>
    <button type="button" className={compact ? "button-secondary" : "button-primary"} onClick={() => setOpen(true)}><Icon name="plus" /> Demander un actif</button>
    {open ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="modal-panel asset-request-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="asset-form-header"><div><p className="eyebrow">Nouvelle demande</p><h2 id={titleId}>Demander un actif</h2><p>Précisez votre besoin pour permettre une validation rapide.</p></div><button type="button" className="button-ghost" aria-label="Fermer" onClick={() => setOpen(false)}><Icon name="x" /></button></header>
        <form onSubmit={submit}>
          {error ? <div className="form-error" role="alert"><Icon name="alertCircle" />{error}</div> : null}
          <fieldset className="form-section"><legend>Informations générales</legend><p className="form-section-help">Sélectionnez la famille de matériel et son niveau d’urgence.</p><div className="form-grid">
            <label className="field-label">Type d’actif demandé<select className="field-control" name="assetType" required defaultValue="COMPUTER">{assetTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><span className="field-help">Le modèle exact sera choisi selon le stock disponible.</span></label>
            <label className="field-label">Priorité<select className="field-control" name="priority" required defaultValue="MEDIUM"><option value="LOW">Basse</option><option value="MEDIUM">Normale</option><option value="HIGH">Haute</option><option value="CRITICAL">Critique</option></select><span className="field-help">Réservez « Critique » aux besoins bloquants.</span></label>
          </div></fieldset>
          <fieldset className="form-section"><legend>Contexte de la demande</legend><p className="form-section-help">Ces informations sont transmises à l’administrateur fonctionnel.</p>
            <label className="field-label">Motif de demande<textarea className="field-control" name="reason" required minLength={10} maxLength={2000} rows={4} placeholder="Ex. Mon ordinateur ne permet plus d’exécuter les outils nécessaires…" /><span className="field-help">10 caractères minimum. Décrivez l’impact sur votre activité.</span></label>
            <label className="field-label">Commentaire <span className="field-optional">Optionnel</span><textarea className="field-control" name="comment" maxLength={2000} rows={3} placeholder="Contraintes, référence ou information complémentaire" /></label>
          </fieldset>
          <footer className="form-actions"><button type="button" className="button-secondary" disabled={submitting} onClick={() => setOpen(false)}>Annuler</button><button type="submit" className="button-primary" disabled={submitting} aria-busy={submitting}>{submitting ? "Envoi…" : "Envoyer la demande"}</button></footer>
        </form>
      </section>
    </div> : null}
  </>;
}
