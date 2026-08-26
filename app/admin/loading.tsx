export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="page-header">
        <span className="skeleton-line skeleton-eyebrow" />
        <span className="skeleton-line skeleton-title" />
        <span className="skeleton-line skeleton-description" />
      </div>
      <div className="loading-grid" aria-hidden="true">
        <div className="loading-block loading-block-large" />
        <div className="loading-block" />
        <div className="loading-block" />
      </div>
      <div className="loading-table" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
      </div>
      <p className="text-xs text-slate-500">Chargement de la console d’administration…</p>
    </div>
  );
}
