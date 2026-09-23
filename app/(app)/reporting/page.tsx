import Link from "next/link";
import { getReportingSummary } from "@/lib/reporting-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";
import { ReportingDashboard } from "@/components/reporting/reporting-dashboard";
import { ReportingFilters } from "@/components/reporting/reporting-filters";

export default async function ReportingPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!permissionCodes(user).includes("reporting:read")) return <div className="reporting-access-limited reporting-card"><p className="eyebrow">Reporting</p><h1>Accès limité</h1><p>Les indicateurs sont réservés aux utilisateurs habilités au reporting.</p></div>;
  const summary = await getReportingSummary(user);
  const canExport = permissionCodes(user).includes("reporting:export");
  return <div className="reporting-page-shell"><ReportingDashboard summary={summary} actions={canExport ? <><Link href="/api/reporting/export" className="button-secondary">Exporter CSV</Link><button type="button" className="button-secondary" disabled aria-disabled="true">Exporter Excel</button></> : <span className="reporting-access-chip">Vue autorisée</span>} /><ReportingFilters /></div>;
}
