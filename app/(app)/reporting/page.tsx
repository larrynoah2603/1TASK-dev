import Link from "next/link";
import { getReportingSummary, reportingPeriodFromQuery } from "@/lib/reporting-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";
import { ReportingDashboard } from "@/components/reporting/reporting-dashboard";
import { ReportingFilterClient } from "@/components/reporting/reporting-filter.client";
import { ReportingSlaOversight } from "@/components/dashboard-visuals";
import { listVisibleTickets } from "@/lib/ticket-query-service";
import { listVisibleQueues } from "@/lib/ticket-queue-service";
import { getProductCapabilities } from "@/lib/product-policy.server";

export default async function ReportingPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = reportingPeriodFromQuery((await searchParams).period);
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!permissionCodes(user).includes("reporting:read")) return <div className="reporting-access-limited reporting-card"><p className="eyebrow">Reporting</p><h1>Accès limité</h1><p>Les indicateurs sont réservés aux utilisateurs habilités au reporting.</p></div>;
  const capabilities = getProductCapabilities();
  const [summary, queues, attentionTickets] = await Promise.all([
    period === "all" ? getReportingSummary(user) : getReportingSummary(user, period),
    capabilities.productionPortfolio || period !== "all" ? Promise.resolve([]) : listVisibleQueues(user),
    capabilities.productionPortfolio || period !== "all" ? Promise.resolve([]) : listVisibleTickets(user, { mode: "REPORTING", workQueue: true, sla: "attention", take: 8, sort: "updated_desc" }),
  ]);
  const canExport = permissionCodes(user).includes("reporting:export");
  return <div className="reporting-page-shell reporting-industrial"><div className="reporting-kpi-primary reporting-kpi-danger reporting-kpi-success" aria-hidden="true" /><ReportingDashboard summary={summary} actions={canExport ? <Link href="/api/reporting/export" className="button-secondary" title="Export du périmètre complet, indépendamment de la période affichée">Exporter CSV · historique complet</Link> : <span className="reporting-access-chip">Vue autorisée</span>} /><ReportingFilterClient period={period} />{!capabilities.productionPortfolio && period === "all" ? <ReportingSlaOversight queues={queues} summary={summary} tickets={attentionTickets} /> : null}</div>;
}
