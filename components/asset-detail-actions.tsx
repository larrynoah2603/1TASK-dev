"use client";

import { useId, useState } from "react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type DepartmentOption = { id: string; code: string; name: string };
type UserOption = { id: string; name: string; email: string; departmentId: string | null };

type AssetDetailActionsProps = {
  assetId: string;
  canManage: boolean;
  departments: DepartmentOption[];
  users: UserOption[];
  currentDepartmentId?: string | null;
  currentUserId?: string | null;
};

export function AssetDetailActions({
  assetId,
  canManage,
  departments,
  users,
  currentDepartmentId = null,
  currentUserId = null,
}: AssetDetailActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const moveTitleId = useId();
  const [toDepartmentId, setToDepartmentId] = useState(currentDepartmentId ?? "");
  const [toUserId, setToUserId] = useState(currentUserId ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogFocus({ open, onClose: () => setOpen(false), closeOnEscape: !submitting });

  if (!canManage) return null;

  function openDialog() {
    setError("");
    setReason("");
    setToDepartmentId(currentDepartmentId ?? "");
    setToUserId(currentUserId ?? "");
    setOpen(true);
  }

  async function moveAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/production/assets/${assetId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toDepartmentId: toDepartmentId || null,
          toUserId: toUserId || null,
          reason,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        const message = data.error ?? "Le mouvement n’a pas pu être enregistré.";
        setError(message);
        toast(message, "error");
        return;
      }
      toast("Mouvement d’actif enregistré.");
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      const message = "Le serveur n’a pas pu enregistrer le mouvement.";
      setError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="button-primary" onClick={openDialog}>
        Modifier l’affectation
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) setOpen(false); }}>
          <section className="modal-panel asset-move-modal" role="dialog" aria-modal="true" aria-labelledby={moveTitleId} tabIndex={-1} ref={dialogRef}>
            <header className="asset-form-header">
              <div>
                <p className="eyebrow">Inventaire</p>
                <h2 id={moveTitleId}>Affectation de l’actif</h2>
                <p>Choisissez la nouvelle destination. L’affectation actuelle est préremplie pour éviter une modification involontaire.</p>
              </div>
              <button type="button" className="modal-close-button" onClick={() => setOpen(false)} disabled={submitting} aria-label="Fermer">×</button>
            </header>

            <form onSubmit={moveAsset}>
              {error ? <div role="alert" className="form-error">{error}</div> : null}

              <fieldset className="form-section">
                <legend>1. Nouvelle affectation</legend>
                <p className="form-section-help">Vous pouvez changer le département, l’utilisateur, ou désaffecter l’actif.</p>
                <div className="form-grid">
                  <label className="field-label">
                    Département cible
                    <Combobox
                      value={toDepartmentId}
                      onChange={(value) => {
                        setToDepartmentId(value);
                        if (toUserId && !users.some((user) => user.id === toUserId && (!value || user.departmentId === value))) setToUserId("");
                      }}
                      ariaLabel="Département cible"
                      placeholder="Aucun département"
                      options={[{ value: "", label: "Aucun département" }, ...departments.map((department) => ({ value: department.id, label: `${department.code} · ${department.name}` }))]}
                    />
                  </label>

                  <label className="field-label">
                    Utilisateur cible
                    <Combobox
                      value={toUserId}
                      onChange={setToUserId}
                      ariaLabel="Utilisateur cible"
                      placeholder="Aucun utilisateur"
                      searchable
                      searchPlaceholder="Rechercher un utilisateur…"
                      options={[{ value: "", label: "Aucun utilisateur" }, ...users.filter((user) => !toDepartmentId || user.departmentId === toDepartmentId).map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` }))]}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="form-section asset-move-reason-section">
                <legend>2. Motif du mouvement</legend>
                <p className="form-section-help">Expliquez brièvement pourquoi l’affectation change. Ce motif restera visible dans l’historique.</p>
                <label className="field-label">
                  Motif
                  <textarea
                    className="field-control asset-move-reason"
                    required
                    minLength={10}
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Ex. Attribution au nouveau collaborateur, retour au stock, transfert de service…"
                  />
                </label>
                <p className="asset-move-audit-note">L’ancienne affectation, la nouvelle destination et l’auteur du mouvement seront tracés automatiquement.</p>
              </fieldset>

              <div className="form-actions">
                <button type="button" className="button-secondary" onClick={() => setOpen(false)} disabled={submitting}>Annuler</button>
                <button type="submit" className="button-primary" disabled={submitting} aria-busy={submitting}>
                  {submitting ? "Enregistrement…" : "Enregistrer le mouvement"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
