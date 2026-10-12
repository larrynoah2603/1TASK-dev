"use client";

import Link from "next/link";
import type { Route } from "next";
import { useId, useMemo, useState } from "react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type AssetRow = { id: string; assetTag: string; type: string; status: string; name: string; serialNumber: string | null; licenseExpiresAt: string | null; department: { id: string; name: string } | null; assignedTo: { id: string; name: string; email: string } | null };
type DepartmentOption = { id: string; code: string; name: string };
type UserOption = { id: string; name: string; email: string; departmentId: string | null };

const typeLabels: Record<string, string> = { COMPUTER: "Ordinateur", SCREEN: "Écran", PHONE: "Téléphone", ACCESSORY: "Accessoire", LICENSE: "Licence", OTHER: "Autre" };
const statusLabels: Record<string, string> = { ACTIVE: "Actif", IN_REPAIR: "En réparation", RETIRED: "Retiré", LOST: "Perdu" };
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "—"; }

export function AssetListClient({ initialAssets, departments, users, canManage, basePath = "/assets" }: { initialAssets: AssetRow[]; departments: DepartmentOption[]; users: UserOption[]; canManage: boolean; basePath?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const createTitleId = useId();
  const [assetTag, setAssetTag] = useState("");
  const [assetType, setAssetType] = useState("COMPUTER");
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogFocus({ open: showCreate, onClose: () => setShowCreate(false), closeOnEscape: !submitting });

  const assets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return initialAssets.filter((asset) => (!normalized || [asset.assetTag, asset.name, asset.serialNumber ?? "", asset.assignedTo?.name ?? ""].some((value) => value.toLowerCase().includes(normalized))) && (type === "ALL" || asset.type === type) && (status === "ALL" || asset.status === status));
  }, [initialAssets, query, status, type]);
  const activeAssets = initialAssets.filter((asset) => asset.status === "ACTIVE").length;
  const assignedAssets = initialAssets.filter((asset) => asset.assignedTo).length;

  async function createAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/production/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetTag, type: assetType, name, serialNumber: serialNumber || null, departmentId: departmentId || null, assignedToId: assignedToId || null, licenseExpiresAt: licenseExpiresAt ? new Date(`${licenseExpiresAt}T12:00:00`).toISOString() : null }) });
      const data = await response.json() as { error?: string; id?: string };
      if (!response.ok || !data.id) { const message = data.error ?? "La création de l’actif a échoué."; setError(message); toast(message, "error"); return; }
      toast("Actif créé avec succès.");
      router.push(`${basePath}/${data.id}` as Route);
    } catch { const message = "Le serveur n’a pas pu créer l’actif."; setError(message); toast(message, "error"); } finally { setSubmitting(false); }
  }

  return <>
    <section className="asset-summary-grid" aria-label="Résumé de l’inventaire"><div className="metric-card"><p className="text-[11px] text-slate-500">Actifs visibles</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{initialAssets.length}</p></div><div className="metric-card"><p className="text-[11px] text-slate-500">Actifs opérationnels</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{activeAssets}</p></div><div className="metric-card"><p className="text-[11px] text-slate-500">Actifs affectés</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{assignedAssets}</p></div></section>
    <section className="panel asset-filter-panel p-4 sm:p-5" aria-label="Filtres de l’inventaire"><div className="asset-filter-controls"><label className="field-label">Rechercher<input type="search" className="field-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tag, nom, série, collaborateur…" /></label><label className="field-label">Type<Combobox value={type} onChange={setType} ariaLabel="Filtrer par type" options={[{ value: "ALL", label: "Tous les types" }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))]} /></label><label className="field-label">État<Combobox value={status} onChange={setStatus} ariaLabel="Filtrer par état" options={[{ value: "ALL", label: "Tous les états" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} /></label>{canManage ? <button type="button" className="button-primary" onClick={() => { setError(""); setShowCreate(true); }}>Nouvel actif</button> : null}</div></section>
    <section className="panel asset-inventory-panel">
      <header className="asset-inventory-header">
        <div>
          <p className="eyebrow">Référentiel technique</p>
          <h2>Inventaire des actifs</h2>
          <p>Consultez l’état, le rattachement et l’affectation de chaque équipement.</p>
        </div>
        <span className="asset-inventory-count" aria-live="polite" aria-atomic="true">{assets.length} résultat{assets.length === 1 ? "" : "s"}</span>
      </header>
      <div className="asset-inventory-scroll" role="region" aria-label="Inventaire des actifs, tableau défilant" tabIndex={0}>
        <table className="data-table asset-inventory-table">
          <caption className="sr-only">Inventaire des actifs, types, états, départements et affectations</caption>
          <thead>
            <tr>
              <th>Actif</th>
              <th>Type</th>
              <th>État</th>
              <th>Département</th>
              <th>Affecté à</th>
              <th>Échéance licence</th>
              <th aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="asset-inventory-row">
                <td className="asset-inventory-primary" data-label="Actif">
                  <Link href={`${basePath}/${asset.id}` as Route} className="asset-inventory-tag">{asset.assetTag}</Link>
                  <strong>{asset.name}</strong>
                  {asset.serialNumber ? <small>N° de série · {asset.serialNumber}</small> : null}
                </td>
                <td className="asset-inventory-meta" data-label="Type">{typeLabels[asset.type] ?? asset.type}</td>
                <td data-label="État"><span className={`status-chip status-chip-${asset.status.toLowerCase()}`}>{statusLabels[asset.status] ?? asset.status}</span></td>
                <td className="asset-inventory-meta" data-label="Département">{asset.department?.name ?? <span className="asset-inventory-muted">Non rattaché</span>}</td>
                <td className="asset-inventory-meta" data-label="Affecté à">{asset.assignedTo ? <><strong>{asset.assignedTo.name}</strong><small>{asset.assignedTo.email}</small></> : <span className="asset-inventory-muted">Non affecté</span>}</td>
                <td className="asset-inventory-meta" data-label="Échéance licence">{formatDate(asset.licenseExpiresAt)}</td>
                <td className="asset-inventory-action" data-label="Détails"><Link href={`${basePath}/${asset.id}` as Route} className="button-secondary">Voir</Link></td>
              </tr>
            ))}
            {!assets.length ? <tr><td colSpan={7} className="asset-inventory-empty">Aucun actif ne correspond aux filtres sélectionnés.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
    {showCreate ? (
      <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) setShowCreate(false); }}>
        <section className="modal-panel asset-create-modal" role="dialog" aria-modal="true" aria-labelledby={createTitleId} tabIndex={-1} ref={dialogRef}>
          <header className="asset-form-header">
            <div>
              <p className="eyebrow">Référentiel technique</p>
              <h2 id={createTitleId}>Créer un actif</h2>
              <p>Enregistrez d’abord l’actif. Son affectation peut être faite maintenant ou plus tard.</p>
            </div>
            <button type="button" className="button-ghost" onClick={() => setShowCreate(false)} disabled={submitting} aria-label="Fermer">×</button>
          </header>

          <form onSubmit={createAsset}>
            {error ? <div role="alert" className="form-error">{error}</div> : null}

            <fieldset className="form-section">
              <legend>1. Identification</legend>
              <p className="form-section-help">Les informations nécessaires pour reconnaître l’actif dans l’inventaire.</p>
              <div className="form-grid">
                <label className="field-label">
                  Type
                  <Combobox
                    value={assetType}
                    onChange={(value) => {
                      setAssetType(value);
                      if (value !== "LICENSE") setLicenseExpiresAt("");
                    }}
                    ariaLabel="Type d’actif"
                    options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
                  />
                </label>
                <label className="field-label">
                  Nom
                  <input className="field-control" required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Portable Dell Latitude…" />
                </label>
                <label className="field-label">
                  Tag inventaire
                  <input className="field-control" required maxLength={80} value={assetTag} onChange={(event) => setAssetTag(event.target.value)} placeholder="AST-2026-001" />
                </label>
                <label className="field-label">
                  Numéro de série <span className="field-optional">Optionnel</span>
                  <input className="field-control" maxLength={180} value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="Ex. SN-45AX…" />
                </label>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>2. Affectation</legend>
              <p className="form-section-help">Facultatif : laissez l’actif disponible dans l’inventaire ou affectez-le immédiatement.</p>
              <div className="form-grid">
                <label className="field-label">
                  Département <span className="field-optional">Optionnel</span>
                  <Combobox
                    value={departmentId}
                    onChange={(value) => {
                      setDepartmentId(value);
                      if (assignedToId && !users.some((user) => user.id === assignedToId && (!value || user.departmentId === value))) setAssignedToId("");
                    }}
                    ariaLabel="Département de l’actif"
                    placeholder="Non rattaché"
                    options={[{ value: "", label: "Non rattaché" }, ...departments.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))]}
                  />
                </label>
                <label className="field-label">
                  Utilisateur <span className="field-optional">Optionnel</span>
                  <Combobox
                    value={assignedToId}
                    onChange={setAssignedToId}
                    ariaLabel="Utilisateur affecté"
                    placeholder="Non affecté"
                    searchable
                    searchPlaceholder="Rechercher un utilisateur…"
                    options={[{ value: "", label: "Non affecté" }, ...users.filter((user) => !departmentId || user.departmentId === departmentId).map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` }))]}
                  />
                </label>
              </div>
            </fieldset>

            {assetType === "LICENSE" ? (
              <fieldset className="form-section">
                <legend>3. Licence</legend>
                <p className="form-section-help">Renseignez l’échéance uniquement pour suivre une licence logicielle.</p>
                <label className="field-label">
                  Échéance de licence <span className="field-optional">Optionnel</span>
                  <input type="date" className="field-control" value={licenseExpiresAt} onChange={(event) => setLicenseExpiresAt(event.target.value)} />
                </label>
              </fieldset>
            ) : null}

            <div className="form-actions">
              <button type="button" className="button-secondary" onClick={() => setShowCreate(false)} disabled={submitting}>Annuler</button>
              <button type="submit" className="button-primary" disabled={submitting} aria-busy={submitting}>{submitting ? "Création…" : "Créer l’actif"}</button>
            </div>
          </form>
        </section>
      </div>
    ) : null}
  </>;
}
