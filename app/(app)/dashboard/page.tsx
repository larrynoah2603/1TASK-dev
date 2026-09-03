import Link from "next/link";
import { RoleCode, TicketStatus } from "@prisma/client";
import { TicketTable } from "@/components/ticket-table";
import { DashboardKpiGrid, DashboardViewTabs, PriorityBreakdown, TicketActivityChart } from "@/components/dashboard-visuals";
import { getRequesterTicketSummary, listVisibleTickets } from "@/lib/ticket-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";

export default async function DashboardPage() {
  const user = await getSessionUserContext();
  if (!user) return null;

  const operationalRoles: RoleCode[] = [RoleCode.AGENT, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];
  const canOperate = roleCodes(user).some((role) => operationalRoles.includes(role));
  const canReport = permissionCodes(user).includes("reporting:read");
  const [personalTickets, statusCounts] = await Promise.all([
    listVisibleTickets(user, { scope: "requested", take: 100 }),
    getRequesterTicketSummary(user),
  ]);
  const personalOpen = ([TicketStatus.NEW, TicketStatus.TO_QUALIFY, TicketStatus.TO_ASSIGN, TicketStatus.ASSIGNED, TicketStatus.REOPENED] as TicketStatus[])
    .reduce((total, status) => total + statusCounts[status], 0);
  const personalInProgress = statusCounts[TicketStatus.IN_PROGRESS];
  const personalBlocked = statusCounts[TicketStatus.BLOCKED];
  const personalClosed = statusCounts[TicketStatus.CLOSED];

  return (
    <div className="dashboard-page dashboard-requester-layout">
      <DashboardViewTabs active="requester" canOperate={canOperate} canReport={canReport} />
      <header className="dashboard-hero dashboard-role-hero">
        <div><p className="eyebrow">Workspace</p><h1>Tableau de bord</h1><p className="page-header-description">Un aperçu rapide de vos demandes et des tickets à traiter.</p></div>
        <Link href="/tickets" className="button-secondary hidden sm:inline-flex">Voir mes tickets</Link>
      </header>

      <DashboardKpiGrid items={[{ label: "Ouverts", value: personalOpen, note: "à qualifier ou affecter", href: "/tickets?status=NEW", tone: "dashboard-kpi-value-brand" }, { label: "En cours", value: personalInProgress, note: "traitement en cours", href: "/tickets?status=IN_PROGRESS", tone: "dashboard-kpi-value-info" }, { label: "Bloqués", value: personalBlocked, note: "information attendue", href: "/tickets?status=BLOCKED", tone: "dashboard-kpi-value-warning" }, { label: "Résolus", value: personalClosed, note: "historique personnel", href: "/tickets?status=CLOSED", tone: "dashboard-kpi-value-success" }]} />

      <div className="dashboard-requester-grid"><TicketActivityChart tickets={personalTickets} /><PriorityBreakdown tickets={personalTickets} /></div>

      <section className="dashboard-widget dashboard-recent-widget" aria-labelledby="recent-tickets-title">
        <div className="dashboard-widget-header"><div><p className="eyebrow">Dernières demandes</p><h2 id="recent-tickets-title">Tickets récents</h2></div><Link href="/tickets" className="dashboard-widget-link">Voir tous les tickets <span aria-hidden="true">→</span></Link></div>
        <div className="dashboard-recent-table"><TicketTable tickets={personalTickets.slice(0, 8)} showActions={false} empty="Vous n’avez encore créé aucun ticket." /></div>
      </section>
    </div>
  );
}
