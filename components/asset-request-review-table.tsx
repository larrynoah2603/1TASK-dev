"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

type RequestRow = { id: string; assetType: string; reason: string; priority: string; status: string; createdAt: string; rejectedReason: string | null; requester: { name: string; email: string; department: { name: string } | null }; asset: { assetTag: string; name: string } | null };
type AvailableAsset = { id: string; assetTag: string; name: string; type: string };
const labels: Record<string, string> = { COMPUTER: "Ordinateur", PHONE: "Téléphone", ACCESSORY: "Accessoire", OTHER: "Autre", LOW: "Basse", MEDIUM: "Normale", HIGH: "Haute", CRITICAL: "Critique", PENDING: "À traiter", APPROVED: "Approuvée", REJECTED: "Refusée" };

export function AssetRequestReviewTable({ requests, availableAssets }: { requests: RequestRow[]; availableAssets: AvailableAsset[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function review(id: string, body: object) {
    setBusy(id); setError("");
    try { const response = await fetch(`/api/admin/asset-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) { const message = data.error ?? "La décision n’a pas été enregistrée."; setError(message); toast(message, "error"); return; } toast({ kind: "success", title: "Décision enregistrée", description: "La demande d’actif a été mise à jour." }); router.refresh(); }
    catch { const message = "Le service est momentanément indisponible."; setError(message); toast(message, "error"); } finally { setBusy(null); }
  }
  return <section className="saas-card asset-review-card">
    {error ? <div className="form-error" role="alert">{error}</div> : null}
    <div className="table-responsive"><table className="saas-table"><caption className="sr-only">Demandes d’actifs à valider</caption><thead><tr><th>Utilisateur</th><th>Département</th><th>Actif demandé</th><th>Motif</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
      {requests.map((request) => <tr key={request.id}><td><strong>{request.requester.name}</strong><small>{request.requester.email}</small></td><td>{request.requester.department?.name ?? "Non renseigné"}</td><td><strong>{labels[request.assetType]}</strong><small>Priorité {labels[request.priority]?.toLowerCase()}</small></td><td><span className="table-reason">{request.reason}</span>{request.rejectedReason ? <small>Motif : {request.rejectedReason}</small> : null}</td><td>{new Intl.DateTimeFormat("fr-FR").format(new Date(request.createdAt))}</td><td><span className={`request-status request-status-${request.status.toLowerCase()}`}>{labels[request.status]}</span></td><td>{request.status === "PENDING" ? <div className="review-actions">
        <select className="field-control" aria-label={`Actif pour ${request.requester.name}`} id={`asset-${request.id}`} defaultValue=""><option value="" disabled>Choisir un actif</option>{availableAssets.filter((asset) => asset.type === request.assetType).map((asset) => <option value={asset.id} key={asset.id}>{asset.assetTag} · {asset.name}</option>)}</select>
        <button type="button" className="button-success" disabled={busy === request.id} aria-busy={busy === request.id} onClick={() => { const select = document.getElementById(`asset-${request.id}`) as HTMLSelectElement; if (!select.value) { setError("Sélectionnez un actif disponible avant d’approuver."); return; } void review(request.id, { decision: "APPROVE", assetId: select.value }); }}>{busy === request.id ? "Validation…" : "Approuver"}</button>
        <button type="button" className="button-danger" disabled={busy === request.id} aria-busy={busy === request.id} onClick={() => { const reason = window.prompt("Motif du refus (10 caractères minimum)"); if (reason) void review(request.id, { decision: "REJECT", rejectedReason: reason }); }}>{busy === request.id ? "Validation…" : "Refuser"}</button>
      </div> : request.asset ? <small>{request.asset.assetTag} · {request.asset.name}</small> : "—"}</td></tr>)}
      {!requests.length ? <tr><td colSpan={7} className="table-empty">Aucune demande d’actif.</td></tr> : null}
    </tbody></table></div>
  </section>;
}
