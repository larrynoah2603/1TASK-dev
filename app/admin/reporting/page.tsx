import { redirect } from "next/navigation";
import { getProductCapabilities } from "@/lib/product-policy.server";
import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin-primitives";
import { STATUS_LABELS } from "@/lib/domain";
import { getReportingSummary, reportingPeriodFromQuery } from "@/lib/reporting-service";
import { ReportingFilterClient } from "@/components/reporting/reporting-filter.client";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminReportingPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = reportingPeriodFromQuery((await searchParams).period);
  const admin = await requireAdminAccess("FUNCTIONAL");
  if (!getProductCapabilities().productionPortfolio) redirect("/reporting");
  const summary = await (period === "all" ? getReportingSummary(admin) : getReportingSummary(admin, period));
  return (
    <div className="space-y-6 admin-reporting-industrial sla-reporting-industrial">
      <AdminPageHeader eyebrow="Indicateurs autorisés" title="Reporting administrateur" description="Les indicateurs sont calculés côté serveur sur les tickets non confidentiels couverts par l’accès fonctionnel. Aucun détail de ticket n’est exposé à un rôle reporting seul." actions={<Link href="/api/reporting/export" className="button-secondary" title="L’export porte sur tout l’historique autorisé">Exporter CSV · historique complet</Link>} />
      <ReportingFilterClient period={period} />
      <div className="reporting-kpi-grid grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Tickets analysés" value={summary.total} detail="Périmètre non confidentiel" />
        <AdminStatCard label="SLA dépassés" value={summary.overdue} detail={`${summary.firstResponseBreached} réponse · ${summary.resolutionBreached} résolution`} tone={summary.overdue ? "danger" : "success"} />
        <AdminStatCard label="Taux clôturé" value={`${summary.closureRate}%`} detail={`${summary.closed} ticket(s) clôturé(s)`} tone="success" />
      </div>
      {!summary.total ? <AdminEmptyState title="Aucune donnée de reporting" description="Aucun ticket non confidentiel n’est disponible dans le périmètre autorisé." /> : (
        <section className="reporting-distribution-panel panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--kit-text)]">Répartition par statut</h2>
          <div className="mt-5 space-y-3">{summary.byStatus.map((row) => <div key={row.status} className="flex items-center gap-4"><span className="w-48 text-sm text-[var(--kit-text-2)]">{STATUS_LABELS[row.status]}</span><div className="reporting-status-track h-2 flex-1 overflow-hidden rounded-full bg-[var(--kit-surface-muted)]"><div className="reporting-status-bar h-full rounded-full bg-[var(--kit-primary)]" style={{ width: `${summary.total ? (row.count / summary.total) * 100 : 0}%` }} /></div><span className="w-10 text-right text-sm font-semibold text-[var(--kit-text-2)]">{row.count}</span></div>)}</div>
        </section>
      )}
    </div>
  );
}
import Link from "next/link";
