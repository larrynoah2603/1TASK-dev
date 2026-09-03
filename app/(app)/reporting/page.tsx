import Link from "next/link";
import { getReportingSummary } from "@/lib/reporting-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";
import { STATUS_LABELS } from "@/lib/domain";

export default async function ReportingPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!permissionCodes(user).includes("reporting:read")) return <div className="reporting-access-limited sla-reporting-industrial reporting-industrial panel p-8"><p className="eyebrow">Reporting</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Accès limité</h1><p className="mt-2 text-sm text-slate-600">Les indicateurs sont réservés aux utilisateurs habilités au reporting.</p></div>;

  const summary = await getReportingSummary(user);
  const canExport = permissionCodes(user).includes("reporting:export");
  return (
    <div className="space-y-6 reporting-page-shell sla-reporting-industrial reporting-industrial">
      <header className="page-header">
        <div>
          <p className="eyebrow">Indicateurs cloisonnés</p>
          <h1 className="mt-2">Reporting opérationnel</h1>
          <p className="page-header-description mt-2">Les chiffres sont calculés uniquement sur les tickets non confidentiels couverts par votre périmètre.</p>
        </div>
        <div className="page-header-actions">{canExport ? <Link href="/api/reporting/export" className="button-secondary">Exporter en CSV</Link> : <span className="reporting-access-chip hidden sm:inline-flex">Vue autorisée</span>}</div>
      </header>
      <div className="reporting-kpi-grid grid gap-3 sm:grid-cols-3">
        <div className="metric-card reporting-kpi reporting-kpi-primary"><p className="text-xs font-medium text-slate-500">Tickets analysés</p><p className="reporting-kpi-value mt-2">{summary.total}</p></div>
        <div className="metric-card reporting-kpi reporting-kpi-danger"><p className="text-xs font-medium text-slate-500">SLA en dépassement</p><p className="reporting-kpi-value mt-2">{summary.overdue}</p><p className="mt-1 text-xs text-slate-500">{summary.firstResponseBreached} réponse · {summary.resolutionBreached} résolution</p></div>
        <div className="metric-card reporting-kpi reporting-kpi-success"><p className="text-xs font-medium text-slate-500">Taux clôturé</p><p className="reporting-kpi-value mt-2">{summary.closureRate}%</p></div>
      </div>
      <section className="reporting-distribution-panel panel p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Répartition</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Tickets par statut</h2></div><span className="text-[11px] text-slate-400">{summary.total} total</span></div>
        <div className="mt-6 space-y-4">{summary.byStatus.map((row) => <div key={row.status} className="flex items-center gap-3"><span className="w-40 shrink-0 text-xs text-slate-600">{STATUS_LABELS[row.status]}</span><div className="reporting-status-track h-2 flex-1 overflow-hidden rounded-full"><div className="reporting-status-bar h-full rounded-full" style={{ width: `${summary.total ? (row.count / summary.total) * 100 : 0}%` }} /></div><span className="w-8 text-right text-xs font-semibold text-slate-700">{row.count}</span></div>)}</div>
      </section>
    </div>
  );
}
