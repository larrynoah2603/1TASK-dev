"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientDetailsPanel } from "@/components/clients/client-details-panel";
import { ClientsGrid } from "@/components/clients/clients-grid";
import { ClientsHeader } from "@/components/clients/clients-header";
import { ClientsSearchBar, type ClientStatusFilter } from "@/components/clients/clients-search-bar";
import { useToast } from "@/components/toast-provider";

export type ClientRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
  _count: { dossiers: number; tickets?: number };
};

export function ClientsPage({ initialClients, canManage }: { initialClients: ClientRow[]; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ClientStatusFilter>("all");
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return initialClients.filter((client) => {
      const matchesQuery = !normalized || [client.code, client.name].some((value) => value.toLocaleLowerCase("fr").includes(normalized));
      const matchesStatus = status === "all" || (status === "active" ? client.isActive : !client.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [initialClients, query, status]);

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

  const activeCount = initialClients.filter((client) => client.isActive).length;
  const dossierCount = initialClients.reduce((total, client) => total + client._count.dossiers, 0);

  return (
    <div className="space-y-5">
      <ClientsHeader clientCount={initialClients.length} activeCount={activeCount} dossierCount={dossierCount} canManage={canManage} onCreate={() => { setError(""); setShowCreate(true); }} />
      <ClientsSearchBar query={query} status={status} resultCount={filteredClients.length} onQueryChange={setQuery} onStatusChange={setStatus} />
      <ClientsGrid clients={filteredClients} onSelect={setSelectedClient} />
      <ClientDetailsPanel client={selectedClient} onClose={() => setSelectedClient(null)} />

      {showCreate ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowCreate(false); }}>
          <section className="modal-panel max-w-lg" role="dialog" aria-modal="true" aria-labelledby="create-client-title">
            <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Référentiel</p><h2 id="create-client-title" className="mt-1 text-lg font-semibold text-slate-900">Créer un client</h2></div><button type="button" className="button-ghost" onClick={() => setShowCreate(false)} aria-label="Fermer">×</button></div>
            <form className="mt-5 space-y-4" onSubmit={createClient}>
              {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}
              <label className="field-label">Code client<input className="field-control" required maxLength={80} value={code} onChange={(event) => setCode(event.target.value)} placeholder="CLI-001" /></label>
              <label className="field-label">Nom du client<input className="field-control" required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom de la structure…" /></label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="button-primary" disabled={submitting}>{submitting ? "Création…" : "Créer le client"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
