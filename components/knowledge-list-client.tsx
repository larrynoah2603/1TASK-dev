"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type ArticleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
type ArticleRow = { id: string; title: string; body: string; tags: string[]; status: ArticleStatus; isPublished: boolean; reviewAt: string | null; updatedAt: string; department: { id: string; code: string; name: string } | null; owner: { id: string; name: string } };
type DepartmentOption = { id: string; code: string; name: string };
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "Non définie"; }
function statusLabel(status: ArticleStatus) { return ({ DRAFT: "Brouillon", REVIEW: "À relire", PUBLISHED: "Publié", ARCHIVED: "Archivé" })[status]; }
function statusClass(status: ArticleStatus) { return status === "PUBLISHED" ? "status-chip-active" : status === "ARCHIVED" ? "status-chip-muted" : status === "REVIEW" ? "status-chip-warning" : "status-chip-draft"; }
const ARTICLE_NEXT_STATUSES: Record<ArticleStatus, ArticleStatus[]> = {
  DRAFT: ["REVIEW", "ARCHIVED"],
  REVIEW: ["PUBLISHED", "ARCHIVED", "DRAFT"],
  PUBLISHED: ["REVIEW", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};
function nextStatuses(status: ArticleStatus): ArticleStatus[] { return ARTICLE_NEXT_STATUSES[status]; }

export function KnowledgeListClient({ initialArticles, departments, canManage }: { initialArticles: ArticleRow[]; departments: DepartmentOption[]; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleRow | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  const [status, setStatus] = useState<ArticleStatus>("DRAFT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const articles = useMemo(() => { const normalized = query.trim().toLowerCase(); return normalized ? initialArticles.filter((article) => [article.title, article.body, article.department?.name ?? "", ...article.tags].some((value) => value.toLowerCase().includes(normalized))) : initialArticles; }, [initialArticles, query]);
  const published = initialArticles.filter((article) => article.status === "PUBLISHED" || article.isPublished).length;
  const departmentScoped = initialArticles.filter((article) => article.department).length;

  async function transitionArticle(articleId: string, nextStatus: ArticleStatus) {
    setError("");
    try {
      const response = await fetch(`/api/knowledge/${articleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, reason: `Transition vers ${statusLabel(nextStatus)} depuis la base de connaissances.` }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setError(data.error ?? "La transition de l’article a échoué."); return; }
      toast(`Article ${statusLabel(nextStatus).toLowerCase()}.`);
      router.refresh();
    } catch { setError("Le serveur n’a pas pu appliquer la transition."); }
  }

  async function createArticle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, tags: tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean), departmentId: departmentId || null, reviewAt: reviewAt ? new Date(`${reviewAt}T12:00:00`).toISOString() : null, status, isPublished: status === "PUBLISHED" }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setError(data.error ?? "La création de l’article a échoué."); return; }
      toast("Article de connaissance créé.");
      setShowCreate(false);
      setTitle(""); setBody(""); setTags(""); setDepartmentId(""); setReviewAt(""); setStatus("DRAFT");
      router.refresh();
    } catch { setError("Le serveur n’a pas pu créer l’article."); } finally { setSubmitting(false); }
  }

  return <>
    <section className="knowledge-kpi-grid grid gap-3 sm:grid-cols-3"><div className="metric-card"><p className="text-[11px] text-slate-500">Articles visibles</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{initialArticles.length}</p></div><div className="metric-card"><p className="text-[11px] text-slate-500">Articles publiés</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{published}</p></div><div className="metric-card"><p className="text-[11px] text-slate-500">Articles départementaux</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{departmentScoped}</p></div></section>
    <section className="knowledge-query-panel panel p-4 sm:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><label className="field-label min-w-0 flex-1">Rechercher dans la base<input className="field-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre, contenu, tag ou département…" /></label>{canManage ? <button type="button" className="button-primary shrink-0" onClick={() => { setError(""); setShowCreate(true); }}>Nouvel article</button> : null}</div></section>
    <section className="knowledge-library-grid grid gap-3 lg:grid-cols-2">{articles.map((article) => <article key={article.id} className="knowledge-article-card metric-card flex min-h-[210px] flex-col"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{article.department?.code ?? "Général"}</p><h2 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">{article.title}</h2></div><span className={`status-chip ${statusClass(article.status)}`}>{statusLabel(article.status)}</span></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{article.body}</p><div className="mt-auto pt-4"><div className="flex flex-wrap gap-1">{article.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded-md bg-[#f0f0ff] px-2 py-1 text-[10px] font-semibold operational-link">#{tag}</span>)}{!article.tags.length ? <span className="text-[10px] text-slate-400">Aucun tag</span> : null}</div><div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-[10px] text-slate-400">{article.owner.name} · MAJ le {formatDate(article.updatedAt)}</p><div className="flex items-center gap-3"><button type="button" className="text-xs font-semibold operational-link hover:underline" onClick={() => setSelectedArticle(article)}>Lire</button>{canManage && nextStatuses(article.status).slice(0, 1).map((nextStatus) => <button key={nextStatus} type="button" className="text-xs font-semibold text-emerald-700 hover:underline" onClick={() => transitionArticle(article.id, nextStatus)}>→ {statusLabel(nextStatus)}</button>)}</div></div></div></article>)}{!articles.length ? <div className="panel p-10 text-center text-sm text-slate-500 lg:col-span-2">Aucun article ne correspond à votre recherche.</div> : null}</section>
    {selectedArticle ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedArticle(null); }}><article className="modal-panel max-w-3xl" role="dialog" aria-modal="true" aria-labelledby="article-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{selectedArticle.department?.name ?? "Base générale"}</p><h2 id="article-title" className="mt-1 text-lg font-semibold text-slate-900">{selectedArticle.title}</h2></div><button type="button" className="button-ghost" onClick={() => setSelectedArticle(null)} aria-label="Fermer">×</button></div><div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedArticle.body}</div><div className="mt-5 flex flex-wrap gap-1 border-t border-slate-100 pt-4">{selectedArticle.tags.map((tag) => <span key={tag} className="rounded-md bg-[#f0f0ff] px-2 py-1 text-[10px] font-semibold operational-link">#{tag}</span>)}</div><p className="mt-4 text-[11px] text-slate-400">Auteur : {selectedArticle.owner.name} · Revue prévue : {formatDate(selectedArticle.reviewAt)}</p></article></div> : null}
    {showCreate ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowCreate(false); }}><section className="modal-panel max-w-3xl" role="dialog" aria-modal="true" aria-labelledby="create-article-title"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Base de connaissances</p><h2 id="create-article-title" className="mt-1 text-lg font-semibold text-slate-900">Créer un article</h2></div><button type="button" className="button-ghost" onClick={() => setShowCreate(false)} aria-label="Fermer">×</button></div><form className="mt-5 space-y-4" onSubmit={createArticle}>{error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}<label className="field-label">Titre<input className="field-control" required minLength={5} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Procédure ou réponse réutilisable…" /></label><label className="field-label">Contenu<textarea className="field-control min-h-56" required minLength={20} maxLength={50000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Décrivez la procédure, les contrôles et la résolution…" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Département<Combobox value={departmentId} onChange={setDepartmentId} ariaLabel="Département de l’article" placeholder="Base générale" options={[{ value: "", label: "Base générale" }, ...departments.map((department) => ({ value: department.id, label: `${department.code} · ${department.name}` }))]} /></label><label className="field-label">Revue prévue<input type="date" className="field-control" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></label></div><label className="field-label">Tags<input className="field-control" maxLength={2400} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="ex. accès, vpn, incident" /><span className="text-[11px] font-normal text-slate-500">Séparez les tags par des virgules.</span></label><label className="field-label">Statut initial<Combobox value={status} onChange={(value) => setStatus(value as ArticleStatus)} ariaLabel="Statut initial de l’article" options={[{ value: "DRAFT", label: "Brouillon" }, { value: "REVIEW", label: "À relire" }, { value: "PUBLISHED", label: "Publié" }, { value: "ARCHIVED", label: "Archivé" }]} /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="button-primary" disabled={submitting}>{submitting ? "Création…" : "Créer l’article"}</button></div></form></section></div> : null}
  </>;
}
