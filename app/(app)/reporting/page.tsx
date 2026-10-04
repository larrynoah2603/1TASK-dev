import Link from "next/link";
import { getReportingSummary } from "@/lib/reporting-service";
import { getSessionUserContext, permissionCodes } from "@/lib/server-auth";
import { ReportingDashboard } from "@/components/reporting/reporting-dashboard";
import { ReportingFilterClient } from "@/components/reporting/reporting-filter.client";
import { ReportingSlaOversight } from "@/components/dashboard-visuals";
import { listVisibleTickets } from "@/lib/ticket-query-service";
import { listVisibleQueues } from "@/lib/ticket-queue-service";
import { getProductCapabilities } from "@/lib/product-policy.server";

export default async function ReportingPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  if (!permissionCodes(user).includes("reporting:read")) return <div className="reporting-access-limited reporting-card"><p className="eyebrow">Reporting</p><h1>Accès limité</h1><p>Les indicateurs sont réservés aux utilisateurs habilités au reporting.</p></div>;
  const capabilities = getProductCapabilities();
  const [summary, queues, attentionTickets] = await Promise.all([
    getReportingSummary(user),
    capabilities.productionPortfolio ? Promise.resolve([]) : listVisibleQueues(user),
    capabilities.productionPortfolio ? Promise.resolve([]) : listVisibleTickets(user, { mode: "REPORTING", workQueue: true, sla: "attention", take: 8, sort: "updated_desc" }),
  ]);
  const canExport = permissionCodes(user).includes("reporting:export");
  return <div className="reporting-page-shell reporting-industrial"><div className="reporting-kpi-primary reporting-kpi-danger reporting-kpi-success" aria-hidden="true" /><ReportingDashboard summary={summary} actions={canExport ? <><Link href="/api/reporting/export" className="button-secondary">Exporter CSV</Link><button type="button" className="button-secondary" disabled aria-disabled="true">Exporter Excel</button></> : <span className="reporting-access-chip">Vue autorisée</span>} />{!capabilities.productionPortfolio ? <ReportingSlaOversight queues={queues} summary={summary} tickets={attentionTickets} /> : null}<ReportingFilterClient /></div>;
}
