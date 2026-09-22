"use client";
import { useEffect, useState } from "react";
type ManagerOption = { id: string; name: string; email: string };
export function AdminManagerSearch({ name, value, onChange, departmentId, excludeId, currentManager }: { name: string; value: string; onChange: (value: string) => void; departmentId: string; excludeId: string; currentManager?: ManagerOption | null }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ManagerOption[]>(currentManager ? [currentManager] : []);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!departmentId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ departmentId, excludeId, ...(query.trim() ? { q: query.trim() } : {}) });
        const response = await fetch(`/api/admin/users/managers?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { managers?: ManagerOption[] };
        setOptions(data.managers ?? []);
      } catch {
        // Search is optional; aborts and transient failures must not block editing.
      } finally { setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [departmentId, excludeId, query]);
  const selected = options.find((item) => item.id === value) ?? (currentManager?.id === value ? currentManager : null);
  return <div className="space-y-2">
    <input type="hidden" name={name} value={value} />
    <input value={query} onChange={(event) => setQuery(event.target.value)} disabled={!departmentId} className="field-control font-normal" placeholder={departmentId ? "Rechercher un manager…" : "Sélectionnez d’abord un département"} aria-label="Rechercher un manager applicatif" />
    {selected ? <button type="button" onClick={() => onChange("")} className="button-ghost min-h-8 w-full justify-between text-xs"><span className="truncate">{selected.name} — {selected.email}</span><span>×</span></button> : null}
    {departmentId && !selected ? <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
      {loading ? <p className="px-2 py-2 text-xs text-slate-500">Recherche…</p> : null}
      {!loading && options.map((item) => <button key={item.id} type="button" onClick={() => { onChange(item.id); setQuery(""); }} className="block w-full rounded-md px-2 py-2 text-left text-xs hover:bg-slate-50"><strong>{item.name}</strong><span className="ml-1 text-slate-500">— {item.email}</span></button>)}
      {!loading && !options.length ? <p className="px-2 py-2 text-xs text-slate-500">Aucun manager correspondant.</p> : null}
    </div> : null}
  </div>;
}
