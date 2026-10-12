"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

type RequestRow = {
  id: string;
  assetType: string;
  reason: string;
  priority: string;
  status: string;
  createdAt: string;
  rejectedReason: string | null;
  requester: {
    name: string;
    email: string;
    department: { name: string } | null;
  };
  asset: { assetTag: string; name: string } | null;
};

type AvailableAsset = {
  id: string;
  assetTag: string;
  name: string;
  type: string;
};

const labels: Record<string, string> = {
  COMPUTER: "Ordinateur",
  PHONE: "Téléphone",
  ACCESSORY: "Accessoire",
  OTHER: "Autre",
  LOW: "Basse",
  MEDIUM: "Normale",
  HIGH: "Haute",
  CRITICAL: "Critique",
  PENDING: "À valider",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};

function requestStatusLabel(request: RequestRow) {
  if (request.status === "APPROVED") {
    return request.asset ? "Attribuée" : "Approuvée · attente de stock";
  }
  return labels[request.status] ?? request.status;
}

export function AssetRequestReviewTable({
  requests,
  availableAssets,
}: {
  requests: RequestRow[];
  availableAssets: AvailableAsset[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function review(id: string, body: object, successDescription: string) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/asset-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error ?? "La décision n’a pas été enregistrée.";
        setError(message);
        toast(message, "error");
        return;
      }
      toast({
        kind: "success",
        title: "Demande mise à jour",
        description: successDescription,
      });
      router.refresh();
    } catch {
      const message = "Le service est momentanément indisponible.";
      setError(message);
      toast(message, "error");
    } finally {
      setBusy(null);
    }
  }

  function selectedAssetId(requestId: string) {
    const select = document.getElementById(`asset-${requestId}`) as HTMLSelectElement | null;
    return select?.value ?? "";
  }

  return (
    <section className="saas-card asset-review-card">
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="table-responsive" role="region" aria-label="Demandes d’actifs : tableau défilant" tabIndex={0}>
        <table className="saas-table asset-review-table">
          <caption className="sr-only">Demandes d’actifs à valider et à attribuer depuis l’inventaire</caption>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Département</th>
              <th>Actif demandé</th>
              <th>Motif</th>
              <th>Date</th>
              <th>Statut</th>
              <th>Inventaire / Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const matchingAssets = availableAssets.filter((asset) => asset.type === request.assetType);
              const awaitingAssignment = request.status === "APPROVED" && !request.asset;
              const pending = request.status === "PENDING";
              const actionable = pending || awaitingAssignment;

              return (
                <tr key={request.id}>
                  <td data-label="Utilisateur">
                    <strong>{request.requester.name}</strong>
                    <small>{request.requester.email}</small>
                  </td>
                  <td data-label="Département">{request.requester.department?.name ?? "Non renseigné"}</td>
                  <td data-label="Actif demandé">
                    <strong>{labels[request.assetType]}</strong>
                    <small>
                      Priorité {labels[request.priority]?.toLowerCase()} · {matchingAssets.length} disponible{matchingAssets.length > 1 ? "s" : ""}
                    </small>
                  </td>
                  <td data-label="Motif">
                    <span className="table-reason">{request.reason}</span>
                    {request.rejectedReason ? <small>Motif : {request.rejectedReason}</small> : null}
                  </td>
                  <td data-label="Date">{new Intl.DateTimeFormat("fr-FR").format(new Date(request.createdAt))}</td>
                  <td data-label="Statut">
                    <span className={`request-status request-status-${request.status.toLowerCase()}`}>
                      {requestStatusLabel(request)}
                    </span>
                  </td>
                  <td data-label="Inventaire et actions">
                    {actionable ? (
                      <div className="review-actions">
                        <select
                          className="field-control"
                          aria-label={`Actif pour ${request.requester.name}`}
                          id={`asset-${request.id}`}
                          defaultValue=""
                          disabled={!matchingAssets.length || busy === request.id}
                        >
                          <option value="">
                            {matchingAssets.length ? "Choisir un actif disponible" : "Aucun actif disponible"}
                          </option>
                          {matchingAssets.map((asset) => (
                            <option value={asset.id} key={asset.id}>
                              {asset.assetTag} · {asset.name}
                            </option>
                          ))}
                        </select>

                        {pending ? (
                          <>
                            <button
                              type="button"
                              className="button-success"
                              disabled={busy === request.id}
                              aria-busy={busy === request.id}
                              onClick={() => {
                                const assetId = selectedAssetId(request.id);
                                if (!assetId) {
                                  setError("Sélectionnez un actif disponible pour approuver et attribuer immédiatement.");
                                  return;
                                }
                                void review(
                                  request.id,
                                  { decision: "APPROVE", assetId },
                                  "La demande est approuvée et l’actif a été attribué.",
                                );
                              }}
                            >
                              {busy === request.id ? "Validation…" : "Approuver et attribuer"}
                            </button>
                            <button
                              type="button"
                              className="button-secondary"
                              disabled={busy === request.id}
                              onClick={() => void review(
                                request.id,
                                { decision: "APPROVE" },
                                "Le besoin est approuvé et reste en attente d’un actif disponible.",
                              )}
                            >
                              Approuver · attente stock
                            </button>
                            <button
                              type="button"
                              className="button-danger"
                              disabled={busy === request.id}
                              aria-busy={busy === request.id}
                              onClick={() => {
                                const reason = window.prompt("Motif du refus (10 caractères minimum)");
                                if (reason) {
                                  void review(
                                    request.id,
                                    { decision: "REJECT", rejectedReason: reason },
                                    "La demande a été refusée.",
                                  );
                                }
                              }}
                            >
                              Refuser
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="button-success"
                            disabled={busy === request.id || !matchingAssets.length}
                            aria-busy={busy === request.id}
                            onClick={() => {
                              const assetId = selectedAssetId(request.id);
                              if (!assetId) {
                                setError("Sélectionnez un actif disponible avant l’attribution.");
                                return;
                              }
                              void review(
                                request.id,
                                { decision: "ASSIGN", assetId },
                                "L’actif a été attribué et apparaît maintenant dans Mes actifs de l’utilisateur.",
                              );
                            }}
                          >
                            {busy === request.id ? "Attribution…" : "Attribuer"}
                          </button>
                        )}
                      </div>
                    ) : request.asset ? (
                      <small>{request.asset.assetTag} · {request.asset.name}</small>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {!requests.length ? (
              <tr>
                <td colSpan={7} className="table-empty">Aucune demande d’actif.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
