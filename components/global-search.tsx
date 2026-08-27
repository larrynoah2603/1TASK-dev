"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = { id: string; reference: string; title: string; status: string; queue: string; updatedAt: string };

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setExpanded(true);
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setOpen(false);
        if (!query.trim()) setExpanded(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [query]);

  useEffect(() => {
    if (query.trim().length < 2) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json() as { tickets?: SearchResult[] };
        if (response.ok) setResults(data.tickets ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const first = results[0];
    if (first) {
      setOpen(false);
      router.push(`/tickets/${first.id}`);
    } else if (query.trim()) {
      setOpen(false);
      router.push(`/tickets?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function collapse() {
    setOpen(false);
    setExpanded(false);
    if (!query.trim()) inputRef.current?.blur();
  }

  return (
    <div ref={ref} className={`global-search-wrap global-search-industrial ${expanded ? "global-search-expanded" : ""}`}>
      <form onSubmit={submit} className="global-search-form">
        <span aria-hidden="true" className="global-search-icon"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4.2 4.2" /></svg></span>
        <input ref={inputRef} value={query} onFocus={() => setExpanded(true)} onChange={(event) => { const next = event.target.value; setQuery(next); setExpanded(true); setOpen(true); if (next.trim().length < 2) { setResults([]); setLoading(false); } }} placeholder="Rechercher…" aria-label="Recherche globale" />
        {expanded ? <button type="button" className="global-search-collapse" onClick={collapse} aria-label="Réduire la recherche">×</button> : <kbd className="global-search-shortcut hidden sm:inline">⌘ K</kbd>}
      </form>
      {open && (query.trim().length >= 2 || loading) ? (
        <div className="popover-panel left-0 right-0 top-[calc(100%+0.5rem)] max-h-96 overflow-y-auto p-2" role="listbox" aria-label="Résultats de recherche">
          {loading ? <p className="global-search-message px-3 py-4 text-xs">Recherche en cours…</p> : null}
          {!loading && !results.length ? <p className="global-search-message px-3 py-4 text-xs">Aucun ticket visible ne correspond à cette recherche.</p> : null}
          {results.map((result) => <Link key={result.id} href={`/tickets/${result.id}`} onClick={() => setOpen(false)} className="search-result search-result-industrial" role="option"><span className="search-result-reference font-mono text-[11px] font-bold">{result.reference}</span><span className="min-w-0 flex-1"><span className="search-result-title block truncate text-xs font-semibold">{result.title}</span><span className="search-result-meta mt-0.5 block truncate text-[11px]">{result.queue} · {result.status}</span></span><span className="search-result-action text-[10px]">Ouvrir</span></Link>)}
        </div>
      ) : null}
    </div>
  );
}
