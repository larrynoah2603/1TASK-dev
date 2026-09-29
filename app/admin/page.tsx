import Link from "next/link";
import type { Route } from "next";
import { RoleCode, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasGlobalRole } from "@/lib/access-control";
import { getAdminUserSummary } from "@/lib/admin-service";
import { AdminNotice, AdminPageHeader, AdminStatCard } from "@/components/admin-primitives";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireAdminAccess, toAccessSubject } from "@/lib/server-auth";

export default async function AdminDashboardPage() {
  const admin = await requireAdminAccess("ANY");
  const functional = hasGlobalRole(toAccessSubject(admin), RoleCode.FUNCTIONAL_ADMIN);

  if (!functional) {
    return (
          <div className="space-y-6 admin-dashboard-industrial">
        <AdminPageHeader
          eyebrow="Périmètre technique"
          title="Administration technique"
          description="Votre rôle est limité aux paramètres techniques autorisés. Les tickets, commentaires internes, audits fonctionnels et données confidentielles restent hors de ce périmètre."
          actions={<Link href={"/admin/technical" as Route} className="button-primary">Voir les paramètres autorisés</Link>}
        />
        <AdminNotice tone="warning">L’administrateur technique ne peut pas modifier l’auteur, le statut métier, l’affectation ou l’historique d’un ticket.</AdminNotice>
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard label="Accès" value="Technique" detail="Permission technical:manage" />
          <AdminStatCard label="Données sensibles" value="Bloquées" detail="Aucun accès implicite aux tickets confidentiels" tone="danger" />
          <AdminStatCard label="Authentification" value="Entra ID" detail="Provider microsoft-entra-id conservé" tone="success" />
        </div>
      </div>
    );
  }

  const [userSummary, ticketCount, activeTicketCount, overdueCount, notificationCount, auditCount, departmentCount, teamCount, queueCount] = await Promise.all([
    getAdminUserSummary(admin),
    prisma.ticket.count({ where: { confidential: false } }),
    prisma.ticket.count({ where: { confidential: false, status: { not: TicketStatus.CLOSED } } }),
    prisma.ticket.count({ where: { confidential: false, status: { not: TicketStatus.CLOSED }, resolutionDueAt: { not: null, lt: new Date() } } }),
    prisma.notificationRule.count({ where: { isActive: true } }),
    prisma.auditLog.count(),
    prisma.department.count({ where: { isActive: true } }),
    prisma.team.count({ where: { isActive: true } }),
    prisma.queue.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="space-y-7 admin-dashboard-industrial">
      <AdminDashboard stats={{ users: userSummary.active, departments: departmentCount, teams: teamCount, queues: queueCount }} />
      <AdminPageHeader
        eyebrow="Tableau de bord global"
        title="Administration du ticketing"
        description="Deux espaces restent séparés : l’espace normal pour les demandes et le traitement, puis cette console réservée aux administrateurs fonctionnels."
      />
      <AdminNotice>Les valeurs brutes du département viennent de Microsoft Entra ID. Le département interne du profil et sa validation sont gérés explicitement dans <code>/admin/users</code> ; le référentiel de correspondance reste audité et ne remplace pas cette affectation.</AdminNotice>

      <div className="admin-console-secondary-grid">
        <AdminStatCard label="Tickets actifs" value={activeTicketCount} detail={`${ticketCount} tickets non confidentiels visibles`} tone="success" />
        <AdminStatCard label="SLA à surveiller" value={overdueCount} detail="Tickets dépassant l’échéance" tone={overdueCount ? "danger" : "success"} />
        <AdminStatCard label="Règles notification" value={notificationCount} detail="Règles actives" tone="warning" />
        <AdminStatCard label="Événements d’audit" value={auditCount} detail="Historique conservé" />
      </div>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Garde-fous actifs</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "Aucune suppression définitive des tickets ou de l’historique.",
            "Toute action sensible exige un motif et conserve l’état avant/après.",
            "Le catalogue reste l’unique source de routage des nouveaux tickets.",
            "L’administrateur technique ne reçoit pas d’accès automatique au contenu sensible.",
          ].map((item) => <p key={item} className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">✓ {item}</p>)}
        </div>
      </section>
    </div>
  );
}
