import { getReportingSummary } from "@/lib/reporting-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";
import { STATUS_LABELS } from "@/lib/domain";

export default async function ReportingPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!permissionCodes(user).includes("reporting:read")) return <div className="reporting-access-limited sla-reporting-industrial reporting-industrial panel p-8"><p className="eyebrow">Reporting</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Accès limité</h1><p className="mt-2 text-sm text-slate-600">Les indicateurs sont réservés aux utilisateurs habilités au reporting.</p></div>;

  const summary = await getReportingSummary(user);
  return (
    <div className="space-y-6 reporting-page-shell sla-reporting-industrial reporting-industrial">
      <header className="page-header">
        <div>
          <p className="eyebrow">Indicateurs cloisonnés</p>
          <h1 className="mt-2">Reporting opérationnel</h1>
          <p className="page-header-description mt-2">Les chiffres sont calculés uniquement sur les tickets non confidentiels couverts par votre périmètre.</p>
        </div>
        <span className="reporting-access-chip hidden rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">Vue autorisée</span>
      </header>
      <div className="reporting-kpi-grid grid gap-3 sm:grid-cols-3">
        <div className="metric-card"><p className="text-xs font-medium text-slate-500">Tickets analysés</p><p className="mt-2 text-2xl font-bold tracking-tight text-[#4c4dba]">{summary.total}</p></div>
        <div className="metric-card"><p className="text-xs font-medium text-slate-500">SLA en dépassement</p><p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">{summary.overdue}</p></div>
        <div className="metric-card"><p className="text-xs font-medium text-slate-500">Taux clôturé</p><p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">{summary.closureRate}%</p></div>
      </div>
      <section className="reporting-distribution-panel panel p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Répartition</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Tickets par statut</h2></div><span className="text-[11px] text-slate-400">{summary.total} total</span></div>
        <div className="mt-6 space-y-4">{summary.byStatus.map((row) => <div key={row.status} className="flex items-center gap-3"><span className="w-40 shrink-0 text-xs text-slate-600">{STATUS_LABELS[row.status]}</span><div className="reporting-status-track h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="reporting-status-bar h-full rounded-full bg-[#5b5bd6]" style={{ width: `${summary.total ? (row.count / summary.total) * 100 : 0}%` }} /></div><span className="w-8 text-right text-xs font-semibold text-slate-700">{row.count}</span></div>)}</div>
      </section>
    </div>
  );
}
