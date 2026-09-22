"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";

function nextHref(basePath: string, query: Record<string, string | undefined>, cursor: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && key !== "page" && key !== "cursor") params.set(key, value);
  }
  params.set("cursor", cursor);
  return `${basePath}?${params.toString()}`;
}

export function TicketCursorPagination({
  basePath,
  query,
  currentCursor,
  nextCursor,
  itemCount,
  pageSize,
}: {
  basePath: string;
  query: Record<string, string | undefined>;
  currentCursor?: string;
  nextCursor: string | null;
  itemCount: number;
  pageSize: number;
}) {
  const router = useRouter();
  if (!currentCursor && !nextCursor) {
    return <p className="text-xs text-slate-400">{itemCount} résultat{itemCount > 1 ? "s" : ""}</p>;
  }
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>{itemCount} élément{itemCount > 1 ? "s" : ""} sur cette page · {pageSize} maximum</span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" disabled={!currentCursor} onClick={() => router.back()} className={`pagination-link ${!currentCursor ? "pagination-link-disabled" : ""}`}>← Précédent</button>
        {nextCursor ? <Link className="pagination-link" href={nextHref(basePath, query, nextCursor) as Route}>Suivant →</Link> : <span className="pagination-link pagination-link-disabled">Suivant →</span>}
      </nav>
    </div>
  );
}
