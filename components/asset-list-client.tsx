"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type AssetRow = { id: string; assetTag: string; type: string; status: string; name: string; serialNumber: string | null; licenseExpiresAt: string | null; department: { id: string; name: string } | null; assignedTo: { id: string; name: string; email: string } | null };
type DepartmentOption = { id: string; code: string; name: string };
type UserOption = { id: string; name: string; email: string; departmentId: string | null };

const typeLabels: Record<string, string> = { COMPUTER: "Ordinateur", SCREEN: "Écran", PHONE: "Téléphone", LICENSE: "Licence", OTHER: "Autre" };
const statusLabels: Record<string, string> = { ACTIVE: "Actif", IN_REPAIR: "En réparation", RETIRED: "Retiré", LOST: "Perdu" };
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "—"; }

export function AssetListClient({ initialAssets, departments, users, canManage }: { initialAssets: AssetRow[]; departments: DepartmentOption[]; users: UserOption[]; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [assetTag, setAssetTag] = useState("");
  const [assetType, setAssetType] = useState("COMPUTER");
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      router.push(`/assets/${data.id}` as Route);
    } catch { const message = "Le serveur n’a pas pu créer l’actif."; setError(message); toast(message, "error"); } finally { setSubmitting(false); }
  }

  return <>
    <section className="grid gap-3 sm:grid-cols-3"><div className="metric-card"><p className="text-[11px] text-slate-500">Actifs visibles</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{initialAssets.length}</p></div><div className="metric-card"><p className="text-[11px] text-slate-500">Actifs opérationnels</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{activeAssets}</p></div><div className="metric-card"><p className="text-[11px] text-slate-500">Actifs affectés</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{assignedAssets}</p></div></section>
    <section className="panel p-4 sm:p-5"><div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_auto] lg:items-end"><label className="field-label">Rechercher<input className="field-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tag, nom, série, collaborateur…" /></label><label className="field-label">Type<Combobox value={type} onChange={setType} ariaLabel="Filtrer par type" options={[{ value: "ALL", label: "Tous les types" }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))]} /></label><label className="field-label">État<Combobox value={status} onChange={setStatus} ariaLabel="Filtrer par état" options={[{ value: "ALL", label: "Tous les états" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} /></label>{canManage ? <button type="button" className="button-primary" onClick={() => { setError(""); setShowCreate(true); }}>Nouvel actif</button> : null}</div></section>
    <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><div><p className="eyebrow">Référentiel technique</p><h2 className="mt-1 text-base font-semibold text-slate-900">Inventaire des actifs</h2></div><span className="text-[11px] text-slate-400">{assets.length} résultat(s)</span></div><div className="overflow-x-auto"><table className="data-table min-w-[900px]"><thead><tr><th>Actif</th><th>Type</th><th>État</th><th>Département</th><th>Affecté à</th><th>Échéance licence</th><th aria-label="Action" /></tr></thead><tbody>{assets.map((asset) => <tr key={asset.id}><td><Link href={`/assets/${asset.id}` as Route} className="font-semibold operational-link hover:underline">{asset.assetTag}</Link><p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{asset.name}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</p></td><td className="text-xs text-slate-600">{typeLabels[asset.type] ?? asset.type}</td><td><span className={`status-chip status-chip-${asset.status.toLowerCase()}`}>{statusLabels[asset.status] ?? asset.status}</span></td><td className="text-xs text-slate-600">{asset.department?.name ?? "Non rattaché"}</td><td className="text-xs text-slate-600">{asset.assignedTo?.name ?? "Non affecté"}</td><td className="text-xs text-slate-500">{formatDate(asset.licenseExpiresAt)}</td><td><Link href={`/assets/${asset.id}` as Route} className="button-ghost text-xs">Ouvrir</Link></td></tr>)}{!assets.length ? <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">Aucun actif ne correspond aux filtres sélectionnés.</td></tr> : null}</tbody></table></div></section>
    {showCreate ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowCreate(false); }}><section className="modal-panel max-w-2xl" role="dialog" aria-modal="true" aria-labelledby="create-asset-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Référentiel technique</p><h2 id="create-asset-title" className="mt-1 text-lg font-semibold text-slate-900">Créer un actif</h2></div><button type="button" className="button-ghost" onClick={() => setShowCreate(false)} aria-label="Fermer">×</button></div><form className="mt-5 space-y-4" onSubmit={createAsset}>{error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}<div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Tag inventaire<input className="field-control" required maxLength={80} value={assetTag} onChange={(event) => setAssetTag(event.target.value)} placeholder="AST-2026-001" /></label><label className="field-label">Type<Combobox value={assetType} onChange={setAssetType} ariaLabel="Type d’actif" options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Nom<input className="field-control" required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Portable de production…" /></label><label className="field-label">Numéro de série<input className="field-control" maxLength={180} value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Département<Combobox value={departmentId} onChange={(value) => { setDepartmentId(value); if (assignedToId && !users.some((user) => user.id === assignedToId && (!value || user.departmentId === value))) setAssignedToId(""); }} ariaLabel="Département de l’actif" placeholder="Non rattaché" options={[{ value: "", label: "Non rattaché" }, ...departments.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))]} /></label><label className="field-label">Affectation<Combobox value={assignedToId} onChange={setAssignedToId} ariaLabel="Utilisateur affecté" placeholder="Non affecté" options={[{ value: "", label: "Non affecté" }, ...users.filter((user) => !departmentId || user.departmentId === departmentId).map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` }))]} /></label></div><label className="field-label">Échéance de licence<input type="date" className="field-control" value={licenseExpiresAt} onChange={(event) => setLicenseExpiresAt(event.target.value)} /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="button-primary" disabled={submitting} aria-busy={submitting}>{submitting ? "Création…" : "Créer l’actif"}</button></div></form></section></div> : null}
  </>;
}
