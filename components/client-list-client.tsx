"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

type ClientRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
  _count: { dossiers: number };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function ClientListClient({ initialClients, canManage }: { initialClients: ClientRow[]; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const clients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? initialClients.filter((client) => [client.code, client.name].some((value) => value.toLowerCase().includes(normalized))) : initialClients;
  }, [initialClients, query]);
  const withDossiers = initialClients.filter((client) => client._count.dossiers > 0).length;
  const totalDossiers = initialClients.reduce((total, client) => total + client._count.dossiers, 0);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/production/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const data = await response.json() as { error?: string; id?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "La création du client a échoué.");
        return;
      }
      toast("Client créé avec succès.");
      router.push(`/clients/${data.id}` as Route);
    } catch {
      setError("Le serveur n’a pas pu créer le client.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="portfolio-kpi-grid grid gap-3 sm:grid-cols-3">
        <div className="metric-card"><p className="text-[11px] text-slate-500">Clients visibles</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{initialClients.length}</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Clients avec dossiers</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{withDossiers}</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Dossiers rattachés</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{totalDossiers}</p></div>
      </section>

      <section className="portfolio-query-panel panel p-4 sm:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><label className="field-label min-w-0 flex-1">Rechercher un client<input className="field-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code ou nom du client…" /></label>{canManage ? <button type="button" className="button-primary shrink-0" onClick={() => { setError(""); setShowCreate(true); }}>Nouveau client</button> : null}</div></section>

      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><div><p className="eyebrow">Référentiel</p><h2 className="mt-1 text-base font-semibold text-slate-900">Clients</h2></div><span className="text-[11px] text-slate-400">{clients.length} résultat(s)</span></div><div className="overflow-x-auto"><table className="data-table min-w-[680px]"><thead><tr><th>Client</th><th>Dossiers</th><th>État</th><th>Dernière mise à jour</th><th aria-label="Action" /></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><Link href={`/clients/${client.id}` as Route} className="font-semibold operational-link hover:underline">{client.name}</Link><p className="mt-0.5 font-mono text-[10px] text-slate-400">{client.code}</p></td><td className="font-semibold text-slate-800">{client._count.dossiers}</td><td><span className={`status-chip ${client.isActive ? "status-chip-active" : "status-chip-archived"}`}>{client.isActive ? "Actif" : "Inactif"}</span></td><td className="text-xs text-slate-500">{formatDate(client.updatedAt)}</td><td><Link href={`/clients/${client.id}` as Route} className="button-ghost text-xs">Ouvrir</Link></td></tr>)}{!clients.length ? <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">Aucun client ne correspond à votre recherche.</td></tr> : null}</tbody></table></div></section>

      {showCreate ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowCreate(false); }}><section className="modal-panel max-w-lg" role="dialog" aria-modal="true" aria-labelledby="create-client-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Référentiel</p><h2 id="create-client-title" className="mt-1 text-lg font-semibold text-slate-900">Créer un client</h2></div><button type="button" className="button-ghost" onClick={() => setShowCreate(false)} aria-label="Fermer">×</button></div><form className="mt-5 space-y-4" onSubmit={createClient}>{error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}<label className="field-label">Code client<input className="field-control" required maxLength={80} value={code} onChange={(event) => setCode(event.target.value)} placeholder="CLI-001" /></label><label className="field-label">Nom du client<input className="field-control" required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom de la structure…" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="button-primary" disabled={submitting}>{submitting ? "Création…" : "Créer le client"}</button></div></form></section></div> : null}
    </>
  );
}
