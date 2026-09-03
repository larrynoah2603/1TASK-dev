import { AdminEmptyState, AdminPageHeader } from "@/components/admin-primitives";
import { Combobox } from "@/components/combobox";
import { Pagination } from "@/components/pagination";
import { listAuditLogsForViewerPage } from "@/lib/audit-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const raw = await searchParams;
  const query = raw.q?.trim() || undefined;
  const page = Math.max(Number(raw.page ?? "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(raw.pageSize ?? "25") || 25, 5), 100);
  const result = await listAuditLogsForViewerPage(admin, { query, page, pageSize });
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Traçabilité" title="Journal d’audit immuable" description="Chaque action sensible conserve l’acteur, l’horodatage, le motif et l’état avant/après. Les historiques ne sont pas supprimables depuis l’application." />
      <form method="get" className="filter-panel grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"><label className="field-label"><span>Recherche dans l’audit</span><input name="q" defaultValue={query} className="field-control" placeholder="Action, objet, acteur ou motif…" /></label><label className="field-label"><span>Résultats par page</span><Combobox name="pageSize" defaultValue={String(pageSize)} options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }]} /></label><div className="flex items-end gap-2"><button className="button-primary">Rechercher</button><a href="/admin/audit" className="button-ghost min-h-10 text-xs">Réinitialiser</a></div></form>
      {!result.logs.length ? <AdminEmptyState title="Aucun événement d’audit" description="Les événements apparaîtront après les premières actions administratives ou exceptionnelles." /> : (
        <div className="table-shell overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-[12px]">
            <thead className="border-b border-slate-100 text-[10px] uppercase tracking-[0.12em]"><tr><th className="px-4 py-3.5">Date</th><th className="px-4 py-3.5">Acteur</th><th className="px-4 py-3.5">Action</th><th className="px-4 py-3.5">Objet</th><th className="px-4 py-3.5">Motif</th><th className="px-4 py-3.5">Avant / après</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{result.logs.map((log) => <tr key={log.id} className="align-top"><td className="whitespace-nowrap px-4 py-3.5 text-[11px] text-slate-500">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}</td><td className="px-4 py-3.5">{log.actor?.name ?? "Système"}<p className="text-[11px] text-slate-400">{log.actor?.email ?? "—"}</p></td><td className="px-4 py-3.5 font-semibold text-slate-800">{log.action}</td><td className="px-4 py-3.5 text-slate-600">{log.objectType}<p className="break-all text-[11px] text-slate-400">{log.objectId}</p></td><td className="max-w-xs px-4 py-3.5 text-slate-600">{log.reason ?? "—"}</td><td className="px-4 py-3.5 text-[11px] text-slate-500"><details><summary className="cursor-pointer font-semibold operational-link">Afficher les valeurs</summary><pre className="mt-2 max-w-md whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2">{JSON.stringify({ oldValue: log.oldValue, newValue: log.newValue }, null, 2)}</pre></details></td></tr>)}</tbody>
          </table>
        </div>
      )}
      <Pagination basePath="/admin/audit" query={{ q: query, pageSize: String(pageSize) }} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} />
    </div>
  );
}
