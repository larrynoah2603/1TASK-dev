import Link from "next/link";
import type { Route } from "next";

function hrefFor(basePath: string, query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, value);
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pagination({ basePath, query, page, totalPages, total, pageSize }: { basePath: string; query: Record<string, string | undefined>; page: number; totalPages: number; total: number; pageSize: number }) {
  if (totalPages <= 1) return <p className="text-xs text-slate-400">{total} résultat{total > 1 ? "s" : ""}</p>;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages].filter((item) => item >= 1 && item <= totalPages)));
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>{total} résultat{total > 1 ? "s" : ""} · page {page} sur {totalPages} · {pageSize} par page</span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <Link aria-disabled={page === 1} className={`pagination-link ${page === 1 ? "pagination-link-disabled" : ""}`} href={hrefFor(basePath, query, Math.max(1, page - 1)) as Route}>← Précédent</Link>
        {pages.map((number) => <Link key={number} aria-current={number === page ? "page" : undefined} className={`pagination-link ${number === page ? "pagination-link-active" : ""}`} href={hrefFor(basePath, query, number) as Route}>{number}</Link>)}
        <Link aria-disabled={page === totalPages} className={`pagination-link ${page === totalPages ? "pagination-link-disabled" : ""}`} href={hrefFor(basePath, query, Math.min(totalPages, page + 1)) as Route}>Suivant →</Link>
      </nav>
    </div>
  );
}
