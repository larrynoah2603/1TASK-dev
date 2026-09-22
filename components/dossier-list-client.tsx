"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type DossierRow = {
  id: string;
  code: string;
  name: string;
  confidential: boolean;
  updatedAt: string;
  client: { id: string; code: string; name: string };
  missions: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    dueAt: string | null;
    department: { name: string } | null;
  }>;
};

type ClientOption = { id: string; code: string; name: string; _count: { dossiers: number } };

function formatDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

const missionStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  BLOCKED: "Bloquée",
  COMPLETED: "Terminée",
  ARCHIVED: "Archivée",
};

export function DossierListClient({
  initialDossiers,
  clients,
  canManage,
}: {
  initialDossiers: DossierRow[];
  clients: ClientOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [clientId, setClientId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const dossiers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return initialDossiers;
    return initialDossiers.filter((dossier) =>
      [dossier.code, dossier.name, dossier.client.code, dossier.client.name]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [initialDossiers, query]);

  const totalMissions = initialDossiers.reduce((total, dossier) => total + dossier.missions.length, 0);
  const activeMissions = initialDossiers.reduce((total, dossier) => total + dossier.missions.filter((mission) => mission.status === "ACTIVE").length, 0);

  async function createDossier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/production/dossiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, code, name, confidential }),
      });
      const data = await response.json() as { error?: string; id?: string };
      if (!response.ok) {
        setError(data.error ?? "La création du dossier a échoué.");
        return;
      }
      toast("Dossier créé avec succès.");
      setShowCreate(false);
      setClientId("");
      setCode("");
      setName("");
      setConfidential(false);
      router.push(`/dossiers/${data.id}` as Route);
    } catch {
      setError("Le serveur n’a pas pu créer le dossier.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="portfolio-kpi-grid grid gap-3 sm:grid-cols-3">
        <div className="metric-card"><p className="text-[11px] text-slate-500">Dossiers visibles</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{initialDossiers.length}</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Missions rattachées</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{totalMissions}</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Missions actives</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{activeMissions}</p></div>
      </section>

      <section className="portfolio-query-panel panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="field-label min-w-0 flex-1">Rechercher un dossier ou un client<input className="field-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, nom du dossier ou client…" /></label>
          {canManage ? <button type="button" className="button-primary shrink-0" onClick={() => { setError(""); setShowCreate(true); }}>Nouveau dossier</button> : null}
        </div>
      </section>

      <section className="portfolio-table-surface panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><div><p className="eyebrow">Portefeuille</p><h2 className="mt-1 text-base font-semibold text-slate-900">Dossiers clients</h2></div><span className="text-[11px] text-slate-400">{dossiers.length} résultat(s)</span></div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead><tr><th>Dossier</th><th>Client</th><th>Missions</th><th>Département(s)</th><th>Dernière mise à jour</th><th aria-label="Action" /></tr></thead>
            <tbody>
              {dossiers.map((dossier) => {
                const departments = [...new Set(dossier.missions.map((mission) => mission.department?.name).filter(Boolean))];
                return <tr key={dossier.id}>
                  <td><Link href={`/dossiers/${dossier.id}` as Route} className="font-semibold operational-link hover:underline">{dossier.code}</Link><p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-500">{dossier.name}{dossier.confidential ? " · Confidentiel" : ""}</p></td>
                  <td><p className="font-medium text-slate-800">{dossier.client.name}</p><p className="font-mono text-[10px] text-slate-400">{dossier.client.code}</p></td>
                  <td><span className="font-semibold text-slate-800">{dossier.missions.length}</span><div className="mt-1 flex flex-wrap gap-1">{dossier.missions.slice(0, 3).map((mission) => <span key={mission.id} className={`status-chip status-chip-${mission.status.toLowerCase()}`}>{missionStatusLabels[mission.status] ?? mission.status}</span>)}</div></td>
                  <td className="text-xs text-slate-600">{departments.length ? departments.join(" · ") : "Non rattaché"}</td>
                  <td className="text-xs text-slate-500">{formatDate(dossier.updatedAt)}</td>
                  <td><Link href={`/dossiers/${dossier.id}` as Route} className="button-ghost text-xs">Ouvrir</Link></td>
                </tr>;
              })}
              {!dossiers.length ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">Aucun dossier ne correspond à votre recherche.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowCreate(false); }}><section className="modal-panel max-w-xl" role="dialog" aria-modal="true" aria-labelledby="create-dossier-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Portefeuille</p><h2 id="create-dossier-title" className="mt-1 text-lg font-semibold text-slate-900">Créer un dossier client</h2></div><button type="button" className="button-ghost" onClick={() => setShowCreate(false)} aria-label="Fermer">×</button></div><form className="mt-5 space-y-4" onSubmit={createDossier}>
        {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}
        <label className="field-label">Client<Combobox required value={clientId} onChange={setClientId} placeholder="Sélectionner un client" options={clients.map((client) => ({ value: client.id, label: `${client.name} · ${client.code}` }))} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Code du dossier<input className="field-control" required maxLength={80} value={code} onChange={(event) => setCode(event.target.value)} placeholder="DOS-2026-001" /></label><label className="field-label">Nom du dossier<input className="field-control" required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Mission annuelle…" /></label></div>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700"><input type="checkbox" checked={confidential} onChange={(event) => setConfidential(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#5b5bd6]" /><span><strong>Dossier confidentiel</strong><span className="mt-1 block text-slate-500">La visibilité sera limitée aux utilisateurs autorisés par le serveur.</span></span></label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="button-primary" disabled={submitting || !clientId}>{submitting ? "Création…" : "Créer le dossier"}</button></div>
      </form></section></div> : null}
    </>
  );
}
