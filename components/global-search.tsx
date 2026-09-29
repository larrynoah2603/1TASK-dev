"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

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

  function openSearch() {
    setExpanded(true);
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div ref={ref} className="kit-search global-search-industrial">
      <form onSubmit={submit} className={`kit-search-form${expanded ? " kit-search-open" : ""}`} role="search">
        <button type="button" className="kit-search-trigger" onClick={openSearch} aria-label="Ouvrir la recherche"><Icon name="search" /></button>
        <input ref={inputRef} value={query} onFocus={() => setExpanded(true)} onChange={(event) => { const next = event.target.value; setQuery(next); setExpanded(true); setOpen(true); if (next.trim().length < 2) { setResults([]); setLoading(false); } }} placeholder="Rechercher un ticket…" aria-label="Recherche globale" />
        {expanded ? <button type="button" className="kit-search-clear" onClick={collapse} aria-label="Réduire la recherche"><Icon name="x" /></button> : <kbd className="kit-kbd hidden sm:inline">⌘ K</kbd>}
      </form>
      {open && (query.trim().length >= 2 || loading) ? (
        <div className="kit-popover kit-popover-full kit-popover-pad kit-popover-scroll" role="listbox" aria-label="Résultats de recherche">
          {loading ? <p className="kit-search-message">Recherche en cours…</p> : null}
          {!loading && !results.length ? <p className="kit-search-message">Aucun ticket visible ne correspond à cette recherche.</p> : null}
          {results.map((result) => <Link key={result.id} href={`/tickets/${result.id}`} onClick={() => setOpen(false)} className="kit-search-result" role="option"><span className="kit-search-ref search-result-reference">{result.reference}</span><span className="min-w-0 flex-1"><span className="kit-search-title">{result.title}</span><span className="kit-search-meta">{result.queue} · {result.status}</span></span><span className="kit-search-open-hint">Ouvrir</span></Link>)}
        </div>
      ) : null}
    </div>
  );
}
