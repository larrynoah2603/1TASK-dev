"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type DepartmentOption = { id: string; code: string; name: string };
type UserOption = { id: string; name: string; email: string; departmentId: string | null };

export function AssetDetailActions({ assetId, canManage, departments, users }: { assetId: string; canManage: boolean; departments: DepartmentOption[]; users: UserOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  if (!canManage) return null;

  async function moveAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/production/assets/${assetId}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toDepartmentId: toDepartmentId || null, toUserId: toUserId || null, reason }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setError(data.error ?? "Le mouvement n’a pas pu être enregistré."); return; }
      toast("Mouvement d’actif enregistré.");
      setOpen(false);
      setToDepartmentId("");
      setToUserId("");
      setReason("");
      router.refresh();
    } catch { setError("Le serveur n’a pas pu enregistrer le mouvement."); } finally { setSubmitting(false); }
  }

  return <><button type="button" className="button-primary" onClick={() => { setError(""); setOpen(true); }}>Enregistrer un mouvement</button>{open ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}><section className="modal-panel max-w-xl" role="dialog" aria-modal="true" aria-labelledby="asset-move-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Inventaire</p><h2 id="asset-move-title" className="mt-1 text-lg font-semibold text-slate-900">Déplacer ou affecter l’actif</h2></div><button type="button" className="button-ghost" onClick={() => setOpen(false)} aria-label="Fermer">×</button></div><form className="mt-5 space-y-4" onSubmit={moveAsset}>{error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}<label className="field-label">Département cible<Combobox value={toDepartmentId} onChange={(value) => { setToDepartmentId(value); if (toUserId && !users.some((user) => user.id === toUserId && (!value || user.departmentId === value))) setToUserId(""); }} ariaLabel="Département cible" placeholder="Conserver / aucun" options={[{ value: "", label: "Aucun département" }, ...departments.map((department) => ({ value: department.id, label: `${department.code} · ${department.name}` }))]} /></label><label className="field-label">Utilisateur cible<Combobox value={toUserId} onChange={setToUserId} ariaLabel="Utilisateur cible" placeholder="Désaffecter / aucun" options={[{ value: "", label: "Aucun utilisateur" }, ...users.filter((user) => !toDepartmentId || user.departmentId === toDepartmentId).map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` }))]} /></label><label className="field-label">Motif<textarea className="field-control min-h-28" required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Précisez le motif du mouvement…" /></label><p className="text-[11px] leading-5 text-slate-500">Le mouvement, l’ancienne affectation et la nouvelle affectation sont tracés dans l’historique.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={() => setOpen(false)}>Annuler</button><button type="submit" className="button-primary" disabled={submitting}>{submitting ? "Enregistrement…" : "Enregistrer"}</button></div></form></section></div> : null}</>;
}
