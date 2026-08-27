import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin-primitives";
import { STATUS_LABELS } from "@/lib/domain";
import { getReportingSummary } from "@/lib/reporting-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminReportingPage() {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const summary = await getReportingSummary(admin);
  return (
    <div className="space-y-6 admin-reporting-industrial sla-reporting-industrial">
      <AdminPageHeader eyebrow="Indicateurs autorisés" title="Reporting administrateur" description="Les indicateurs sont calculés côté serveur sur les tickets non confidentiels couverts par l’accès fonctionnel. Aucun détail de ticket n’est exposé à un rôle reporting seul." />
      <div className="reporting-kpi-grid grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Tickets analysés" value={summary.total} detail="Périmètre non confidentiel" />
        <AdminStatCard label="SLA dépassés" value={summary.overdue} detail="Tickets encore ouverts" tone={summary.overdue ? "rose" : "emerald"} />
        <AdminStatCard label="Taux clôturé" value={`${summary.closureRate}%`} detail={`${summary.closed} ticket(s) clôturé(s)`} tone="emerald" />
      </div>
      {!summary.total ? <AdminEmptyState title="Aucune donnée de reporting" description="Aucun ticket non confidentiel n’est disponible dans le périmètre autorisé." /> : (
        <section className="reporting-distribution-panel panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Répartition par statut</h2>
          <div className="mt-5 space-y-3">{summary.byStatus.map((row) => <div key={row.status} className="flex items-center gap-4"><span className="w-48 text-sm text-slate-600">{STATUS_LABELS[row.status]}</span><div className="reporting-status-track h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="reporting-status-bar h-full rounded-full bg-[#5b5bd6]" style={{ width: `${summary.total ? (row.count / summary.total) * 100 : 0}%` }} /></div><span className="w-10 text-right text-sm font-semibold text-slate-700">{row.count}</span></div>)}</div>
        </section>
      )}
    </div>
  );
}
