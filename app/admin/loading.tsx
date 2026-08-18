export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement de l’administration">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-white" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-slate-100 bg-white" />
    </div>
  );
}
