import Link from "next/link";
import type { Route } from "next";
import { Priority, TicketStatus } from "@prisma/client";
import { ClaimTicketButton } from "@/components/claim-ticket-button";
import { SlaBadge } from "@/components/sla-badge";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";

type DashboardTicket = {
  id: string;
  reference: string;
  title: string;
  status: TicketStatus;
  priority: Priority;
  updatedAt: Date;
  requester: { name: string };
  assignedTo: { name: string } | null;
  queue: { name: string; department: { name: string }; manager?: { name: string } | null };
  sourceDepartment?: { name: string } | null;
  serviceCatalogItem?: { name: string } | null;
  slaState: "NONE" | "OK" | "AT_RISK" | "BREACHED" | "PAUSED" | "CONFIRMATION_PENDING" | "CONFIRMATION_DUE";
  slaDueAt: Date | null;
};

export type DashboardTicketRow = DashboardTicket;

type QueueSummary = {
  id: string;
  name: string;
  code: string;
  department: { name: string };
  manager: { name: string } | null;
  _count: { tickets: number; teams: number };
  operationalStats: { urgent: number; blocked: number; slaAtRisk: number };
};

export type DashboardQueueSummary = QueueSummary;

type ReportingSummary = {
  total: number;
  closed: number;
  overdue: number;
  completionDenominator: number;
  slaTracked: number;
  slaComplianceRate: number;
  closureRate: number;
  byStatus: { status: TicketStatus; count: number }[];
};

type PortfolioSummary = {
  total: number;
  active: number;
  late: number;
  budgetMinutes: number;
  worklogMinutes: number;
};

type PortfolioMission = {
  id: string;
  code: string;
  name: string;
  status: string;
  dueAt: Date | null;
  budgetMinutes: number | null;
  worklogMinutes: number;
  dossier: { code: string; client: { name: string } };
  isLate: boolean;
};

const priorityColor: Record<Priority, string> = {
  [Priority.LOW]: "var(--kit-secondary)",
  [Priority.MEDIUM]: "var(--kit-primary)",
  [Priority.HIGH]: "var(--kit-warning)",
  [Priority.CRITICAL]: "var(--kit-danger)",
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
}

function formatDateTime(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatHours(date: Date | null) {
  if (!date) return "—";
  const hours = Math.max(0, Math.round((date.getTime() - Date.now()) / 3_600_000));
  return hours >= 0 ? `${hours} h` : `${Math.abs(hours)} h dépassées`;
}

export function DashboardViewTabs({
  active,
  canOperate,
  canReport,
}: {
  active: "requester" | "operations" | "responsible";
  canOperate: boolean;
  canReport: boolean;
}) {
  const tabs = [
    { key: "requester" as const, label: "Vue personnelle", href: "/dashboard", visible: true },
    { key: "operations" as const, label: "Boîte agent", href: "/inbox", visible: canOperate },
    { key: "responsible" as const, label: "Pilotage SLA", href: "/dashboard/responsible", visible: canReport },
  ];

  return (
    <nav className="dashboard-view-tabs" aria-label="Vues du dashboard">
      {tabs.filter((tab) => tab.visible).map((tab) => (
        <Link key={tab.key} href={tab.href as Route} className={`dashboard-view-tab${active === tab.key ? " is-active" : ""}`} aria-current={active === tab.key ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardKpiGrid({
  items,
  columns = "xl:grid-cols-4",
}: {
  items: { label: string; value: string | number; note: string; href?: string; tone?: string }[];
  columns?: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${columns}`}>
      {items.map((item) => {
        const content = (
          <>
            <div className="dashboard-kpi-topline">
              <span className="dashboard-kpi-label">{item.label}</span>
            </div>
            <p className={`dashboard-kpi-value ${item.tone ?? "dashboard-kpi-value-brand"}`}>{item.value}</p>
            <p className="dashboard-kpi-note">{item.note}</p>
          </>
        );
        return item.href ? <Link key={item.label} href={item.href as Route} className="dashboard-kpi-card dashboard-kpi-link">{content}</Link> : <div key={item.label} className="dashboard-kpi-card">{content}</div>;
      })}
    </div>
  );
}

export function TicketActivityChart({ tickets }: { tickets: DashboardTicket[] }) {
  const now = new Date();
  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { date, count: tickets.filter((ticket) => new Date(ticket.updatedAt).toISOString().slice(0, 10) === key).length };
  });
  const max = Math.max(...points.map((point) => point.count), 1);
  const polyline = points.map((point, index) => `${index * 100},${92 - (point.count / max) * 70}`).join(" ");

  return (
    <section className="dashboard-widget dashboard-chart-widget" aria-labelledby="ticket-activity-title">
      <div className="dashboard-widget-header"><div><p className="eyebrow">Activité personnelle</p><h2 id="ticket-activity-title">Volume de tickets</h2></div><span className="dashboard-widget-filter">7 derniers jours</span></div>
      <div className="dashboard-chart-legend"><span className="dashboard-legend-dot dashboard-legend-brand" />Tickets actualisés</div>
      <div className="dashboard-chart-wrap">
        <svg className="dashboard-line-chart" viewBox="0 0 600 120" role="img" aria-label="Évolution du volume de tickets sur les sept derniers jours" preserveAspectRatio="none">
          <defs><linearGradient id="dashboard-line-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>
          <path d={`M 0 120 L ${polyline.split(" ").map((point) => point.replace(",", " ")).join(" L ")} L 600 120 Z`} fill="url(#dashboard-line-fill)" />
          <polyline points={polyline} fill="none" stroke="var(--brand)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          {points.map((point, index) => <circle key={point.date.toISOString()} cx={index * 100} cy={92 - (point.count / max) * 70} r="4" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
        </svg>
      </div>
      <div className="dashboard-chart-axis">{points.map((point) => <span key={point.date.toISOString()}>{formatDate(point.date)}</span>)}</div>
    </section>
  );
}

export function PriorityBreakdown({ tickets, href = "/tickets" }: { tickets: DashboardTicket[]; href?: string }) {
  const total = tickets.length;
  return (
    <section className="dashboard-widget dashboard-priority-widget" aria-labelledby="priority-title">
      <div className="dashboard-widget-header"><div><p className="eyebrow">Répartition</p><h2 id="priority-title">Par priorité</h2></div><span className="dashboard-widget-total">{total} total</span></div>
      <div className="dashboard-priority-list">
        {Object.values(Priority).map((priority) => {
          const count = tickets.filter((ticket) => ticket.priority === priority).length;
          const width = total ? Math.max(4, (count / total) * 100) : 0;
          return <div key={priority} className="dashboard-priority-row"><span className="dashboard-priority-dot" style={{ backgroundColor: priorityColor[priority] }} /><span className="dashboard-priority-label">{PRIORITY_LABELS[priority]}</span><div className="dashboard-priority-track"><span style={{ width: `${width}%`, backgroundColor: priorityColor[priority] }} /></div><strong>{count}</strong></div>;
        })}
      </div>
      <Link href={href as Route} className="dashboard-widget-link">Voir les tickets <span aria-hidden="true">→</span></Link>
    </section>
  );
}

export function OperationsQueuePanel({ queues }: { queues: QueueSummary[] }) {
  return (
    <section className="dashboard-widget dashboard-queue-panel" aria-labelledby="queue-workload-title">
      <div className="dashboard-widget-header"><div><p className="eyebrow">Supervision</p><h2 id="queue-workload-title">Charge des files</h2></div><Link href="/queues" className="dashboard-widget-link">Détail <span aria-hidden="true">→</span></Link></div>
      <div className="dashboard-queue-list">
        {queues.slice(0, 5).map((queue) => {
          const total = Math.max(queue._count.tickets, 1);
          const attention = queue.operationalStats.slaAtRisk + queue.operationalStats.urgent;
          const width = Math.min(100, Math.round((attention / total) * 100));
          return <Link key={queue.id} href={`/inbox?queueId=${encodeURIComponent(queue.id)}` as Route} className="dashboard-queue-row"><span className="dashboard-queue-name"><strong>{queue.name}</strong><small>{queue.department.name} · {queue._count.teams} équipe(s)</small></span><span className="dashboard-queue-progress"><span><i style={{ width: `${Math.max(width, 5)}%` }} /></span><em>{queue._count.tickets}</em></span></Link>;
        })}
        {!queues.length ? <p className="dashboard-empty">Aucune file dans votre périmètre.</p> : null}
      </div>
    </section>
  );
}

export function OperationsTicketTable({ tickets, claimableTicketIds = [] }: { tickets: DashboardTicket[]; claimableTicketIds?: string[] }) {
  const claimable = new Set(claimableTicketIds);
  if (!tickets.length) return <div className="dashboard-empty dashboard-table-empty">Aucun ticket actif pour ces critères.</div>;
  return (
    <div className="dashboard-operation-table-wrap">
      <table className="dashboard-operation-table inbox-operations-table-complete" aria-label="File opérationnelle">
        <thead><tr><th>Ticket</th><th>Suivi</th><th>Traitement</th><th className="dashboard-table-action inbox-operations-action-heading">Action</th></tr></thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td className="inbox-operations-ticket-cell"><Link href={`/tickets/${ticket.id}` as Route} className="dashboard-ticket-reference">{ticket.reference}</Link><Link href={`/tickets/${ticket.id}` as Route} className="dashboard-ticket-title">{ticket.title}</Link><small>{ticket.serviceCatalogItem?.name ?? ticket.queue.name} · Demandeur : {ticket.requester.name}</small></td>
              <td className="inbox-operations-followup-cell"><div className="inbox-operations-badges"><PriorityBadge priority={ticket.priority} /><StatusBadge status={ticket.status} /><SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact /></div></td>
              <td className="inbox-operations-assignment-cell">{ticket.assignedTo ? <><span className="dashboard-avatar dashboard-avatar-assignee">{ticket.assignedTo.name.slice(0, 2).toUpperCase()}</span>{ticket.assignedTo.name}</> : <span className="dashboard-muted">Non affecté</span>}</td>
              <td className="dashboard-table-action inbox-operations-action-cell">{claimable.has(ticket.id) ? <ClaimTicketButton ticketId={ticket.id} /> : <Link href={`/tickets/${ticket.id}` as Route} className="dashboard-row-action">Ouvrir</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OperationsWatchPanel({ tickets }: { tickets: DashboardTicket[] }) {
  const attention = tickets.filter((ticket) => ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED").slice(0, 6);
  return (
    <aside className="dashboard-watch-panel" aria-labelledby="watch-panel-title">
      <div className="dashboard-watch-header"><div><p className="eyebrow">Priorité opérationnelle</p><h2 id="watch-panel-title">À surveiller</h2></div><span className="dashboard-watch-count">{attention.length}</span></div>
      <div className="dashboard-watch-list">
        {attention.map((ticket) => <Link key={ticket.id} href={`/tickets/${ticket.id}` as Route} className={`dashboard-watch-card dashboard-watch-${ticket.slaState.toLowerCase()}`}><div className="dashboard-watch-card-top"><strong>{ticket.reference}</strong><span>{ticket.slaState === "BREACHED" ? "SLA dépassé" : "SLA à surveiller"}</span></div><b>{ticket.title}</b><small><span className="dashboard-avatar dashboard-avatar-watch">{ticket.requester.name.slice(0, 2).toUpperCase()}</span>{ticket.requester.name}</small><em>{ticket.slaState === "BREACHED" ? formatHours(ticket.slaDueAt) : `SLA dans ${formatHours(ticket.slaDueAt)}`}</em></Link>)}
        {!attention.length ? <p className="dashboard-empty">Aucune alerte SLA pour cette vue.</p> : null}
      </div>
      <Link href="/inbox?sla=attention" className="dashboard-watch-footer">Voir toutes les alertes <span aria-hidden="true">→</span></Link>
    </aside>
  );
}

export function SlaPerformanceWidget({ summary }: { summary: ReportingSummary }) {
  const healthyRate = summary.slaComplianceRate;
  const active = Math.max(0, summary.total - summary.closed);
  const states = [
    { label: "Objectif SLA", value: 90, tone: "dashboard-sla-target" },
    { label: "Réel", value: healthyRate, tone: "dashboard-sla-current" },
    { label: "Tickets actifs dans le périmètre", value: summary.total ? Math.min(100, Math.round((active / summary.total) * 100)) : 0, tone: "dashboard-sla-active" },
  ];
  return (
    <section className="dashboard-widget dashboard-sla-widget" aria-labelledby="sla-performance-title">
      <div className="dashboard-widget-header"><div><p className="eyebrow">Qualité de service</p><h2 id="sla-performance-title">Performance SLA</h2></div><span className="dashboard-widget-filter">Périmètre autorisé</span></div>
      <div className="dashboard-chart-legend dashboard-sla-legend"><span className="dashboard-legend-dot dashboard-legend-success" />Objectif <span className="dashboard-legend-dot dashboard-legend-brand" />Réel</div>
      <div className="dashboard-sla-bars">
        {states.map((state) => <div className="dashboard-sla-row" key={state.label}><span>{state.label}</span><div><i className={state.tone} style={{ width: `${state.value}%` }} /></div><strong>{state.value}%</strong></div>)}
      </div>
      <div className="dashboard-sla-note"><span className="dashboard-sla-note-icon">✓</span><span><strong>Objectif SLA : 90%</strong><small>{summary.overdue} dépassement(s) à traiter dans le périmètre.</small></span></div>
    </section>
  );
}

export function TeamLoadPanel({ queues }: { queues: QueueSummary[] }) {
  const max = Math.max(...queues.map((queue) => queue._count.tickets), 1);
  return (
    <section className="dashboard-widget dashboard-team-load" aria-labelledby="team-load-title">
      <div className="dashboard-widget-header"><div><p className="eyebrow">Capacité opérationnelle</p><h2 id="team-load-title">Charge des équipes</h2></div><span className="dashboard-widget-filter">Aujourd’hui</span></div>
      <div className="dashboard-team-list">
        {queues.slice(0, 6).map((queue) => {
          const ratio = Math.round((queue._count.tickets / max) * 100);
          const tone = queue.operationalStats.slaAtRisk > 0 ? "dashboard-load-warning" : "dashboard-load-success";
          return <Link key={queue.id} href={`/inbox?queueId=${encodeURIComponent(queue.id)}` as Route} className="dashboard-team-row"><span className="dashboard-team-icon">♧</span><span className="dashboard-team-name">{queue.name}</span><span className="dashboard-team-track"><i className={tone} style={{ width: `${Math.max(ratio, 6)}%` }} /></span><strong>{queue._count.tickets}</strong></Link>;
        })}
        {!queues.length ? <p className="dashboard-empty">Aucune équipe dans le périmètre.</p> : null}
      </div>
      <Link href="/queues" className="dashboard-widget-link">Voir le détail par file <span aria-hidden="true">→</span></Link>
    </section>
  );
}

export function ResponsibleEscalations({ tickets }: { tickets: DashboardTicket[] }) {
  const attention = tickets.filter((ticket) => ticket.slaState === "AT_RISK" || ticket.slaState === "BREACHED").slice(0, 8);
  return (
    <section className="dashboard-widget dashboard-escalations-widget" aria-labelledby="escalations-title">
      <div className="dashboard-widget-header"><div><p className="eyebrow">SLA et escalades</p><h2 id="escalations-title">Escalades récentes</h2></div><Link href="/inbox?sla=attention" className="dashboard-widget-link">Tout afficher <span aria-hidden="true">→</span></Link></div>
      {attention.length ? <div className="dashboard-escalation-table-wrap"><table className="dashboard-escalation-table"><thead><tr><th>Ticket</th><th>File</th><th>Motif</th><th>Échéance</th><th>État</th></tr></thead><tbody>{attention.map((ticket) => <tr key={ticket.id}><td><Link href={`/tickets/${ticket.id}` as Route} className="dashboard-ticket-reference">{ticket.reference}</Link><small>{ticket.title}</small></td><td>{ticket.queue.name}</td><td>{ticket.slaState === "BREACHED" ? "Dépassement du délai SLA" : "Risque de dépassement"}</td><td>{formatDateTime(ticket.slaDueAt)}</td><td><span className={`dashboard-escalation-badge dashboard-escalation-${ticket.priority.toLowerCase()}`}>{PRIORITY_LABELS[ticket.priority]}</span></td></tr>)}</tbody></table></div> : <p className="dashboard-empty">Aucune escalade dans le périmètre actuel.</p>}
    </section>
  );
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours} h ${remaining.toString().padStart(2, "0")}` : `${remaining} min`;
}

function PortfolioMissionWidget({ missions, summary }: { missions: PortfolioMission[]; summary?: PortfolioSummary }) {
  const activeMissions = summary?.active ?? missions.filter((mission) => mission.status === "ACTIVE").length;
  const lateMissions = summary?.late ?? missions.filter((mission) => mission.isLate).length;
  const visibleMissions = summary?.total ?? missions.length;
  const totalBudget = summary?.budgetMinutes ?? missions.reduce((total, mission) => total + (mission.budgetMinutes ?? 0), 0);
  const totalLogged = summary?.worklogMinutes ?? missions.reduce((total, mission) => total + mission.worklogMinutes, 0);
  return <section className="dashboard-widget" aria-labelledby="portfolio-missions-title"><div className="dashboard-widget-header"><div><p className="eyebrow">Portefeuille de production</p><h2 id="portfolio-missions-title">Missions à piloter</h2></div><Link href={"/missions" as Route} className="dashboard-widget-link">Voir les missions <span aria-hidden="true">→</span></Link></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"><p className="text-[10px] text-slate-500">Visibles</p><p className="mt-1 text-lg font-bold text-slate-900">{visibleMissions}</p></div><div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"><p className="text-[10px] text-slate-500">Actives</p><p className="mt-1 text-lg font-bold text-emerald-700">{activeMissions}</p></div><div className={`rounded-lg border p-2.5 ${lateMissions ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50/70"}`}><p className="text-[10px] text-slate-500">En retard</p><p className={`mt-1 text-lg font-bold ${lateMissions ? "text-rose-700" : "text-slate-900"}`}>{lateMissions}</p></div><div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"><p className="text-[10px] text-slate-500">Temps / budget</p><p className="mt-1 text-xs font-bold text-slate-900">{formatMinutes(totalLogged)}{totalBudget ? ` / ${formatMinutes(totalBudget)}` : ""}</p></div></div><div className="mt-4 space-y-2">{missions.slice(0, 5).map((mission) => { const percent = mission.budgetMinutes ? Math.min(100, Math.round((mission.worklogMinutes / mission.budgetMinutes) * 100)) : null; return <Link key={mission.id} href={`/missions/${mission.id}` as Route} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 transition hover:border-[var(--kit-border-strong)] hover:bg-[var(--kit-hover)]"><span className={`h-2 w-2 shrink-0 rounded-full ${mission.isLate ? "bg-rose-500" : mission.status === "BLOCKED" ? "bg-amber-500" : "bg-emerald-500"}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{mission.code} · {mission.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{mission.dossier.client.name} · {mission.dossier.code} · échéance {formatDate(mission.dueAt)}</p></div><div className="w-16 shrink-0 text-right"><p className="text-[10px] font-semibold text-slate-600">{percent === null ? "—" : `${percent}%`}</p>{percent !== null ? <div className="mt-1 h-1 rounded-full bg-slate-100"><div className={`h-1 rounded-full ${percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${percent}%` }} /></div> : null}</div></Link>; })}{!missions.length ? <p className="dashboard-empty">Aucune mission visible dans votre périmètre.</p> : null}</div></section>;
}

export function ResponsibleDashboard({ queues, summary, tickets, missionSummary, missions = [] }: { queues: QueueSummary[]; summary: ReportingSummary; tickets: DashboardTicket[]; missionSummary?: PortfolioSummary; missions?: PortfolioMission[] }) {
  const healthyRate = summary.slaComplianceRate;
  const active = tickets.filter((ticket) => ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.CANCELLED).length;
  return (
    <div className="dashboard-responsible-layout">
      <header className="dashboard-hero dashboard-role-hero">
        <div><p className="eyebrow">Espace responsable</p><h1>Pilotage du support</h1><p className="page-header-description">Vue d’ensemble de la qualité de service et de la charge des équipes.</p></div>
        <Link href="/reporting" className="button-secondary">Ouvrir le reporting</Link>
      </header>
      <DashboardKpiGrid items={[{ label: "Tickets ouverts", value: summary.total - summary.closed, note: "dans le périmètre autorisé", tone: "dashboard-kpi-value-brand" }, { label: "SLA actifs dans les délais", value: `${healthyRate}%`, note: `${summary.overdue} dépassement(s) sur ${summary.slaTracked} suivi(s)`, tone: "dashboard-kpi-value-success" }, { label: "Taux clôturé", value: `${summary.closureRate}%`, note: `${summary.closed} ticket(s) clôturé(s)`, tone: "dashboard-kpi-value-info" }, { label: "Charge active", value: active, note: "tickets opérationnels visibles", tone: "dashboard-kpi-value-warning" }]} />
      <div className="dashboard-responsible-grid"><SlaPerformanceWidget summary={summary} /><TeamLoadPanel queues={queues} /></div>
      <PortfolioMissionWidget missions={missions} summary={missionSummary} />
      <ResponsibleEscalations tickets={tickets} />
    </div>
  );
}

/** SLA oversight reused by the V1 reporting destination without production portfolio data. */
export function ReportingSlaOversight({ queues, summary, tickets }: { queues: QueueSummary[]; summary: ReportingSummary; tickets: DashboardTicket[] }) {
  return <section className="dashboard-responsible-layout" aria-labelledby="reporting-sla-title"><header className="dashboard-hero dashboard-role-hero"><div><p className="eyebrow">Pilotage opérationnel</p><h2 id="reporting-sla-title">Supervision SLA</h2><p className="page-header-description">Charge des files et alertes dans votre périmètre autorisé.</p></div></header><div className="dashboard-responsible-grid"><SlaPerformanceWidget summary={summary} /><TeamLoadPanel queues={queues} /></div><ResponsibleEscalations tickets={tickets} /></section>;
}
