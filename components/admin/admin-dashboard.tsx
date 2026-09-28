import { Building2, Inbox, Users, UsersRound } from "lucide-react";
import { AdminCalendarCard } from "./admin-calendar-card";
import { AdminHeader } from "./admin-header";
import { AdminNotificationCard } from "./admin-notification-card";
import { AdminQueueCard } from "./admin-queue-card";
import { AdminSettingsCard } from "./admin-settings-card";
import { AdminStatCard } from "./admin-stat-card";
import { AdminTeamCard } from "./admin-team-card";
import { AdminUsersTable } from "./admin-users-table";

export type AdminDashboardStats = { users: number; departments: number; teams: number; queues: number; notificationRules: number };

const sections = [
  { href: "/admin/users", label: "Utilisateurs", description: "Identités, rôles et habilitations", icon: Users },
  { href: "/admin/departments", label: "Départements", description: "Organisation et correspondance Entra", icon: Building2 },
  { href: "/admin/teams", label: "Équipes", description: "Responsables et agents", icon: UsersRound },
  { href: "/admin/queues", label: "Files de tickets", description: "Routage, managers et SLA", icon: Inbox },
];

export function AdminDashboard({ stats }: { stats: AdminDashboardStats }) {
  return <div className="admin-modern-page">
    <AdminHeader />
    <section className="admin-modern-stats" aria-label="Indicateurs administration">
      <AdminStatCard label="Utilisateurs" value={stats.users} detail="actifs et synchronisés" icon={Users} tone="blue" />
      <AdminStatCard label="Départements" value={stats.departments} detail="organisation active" icon={Building2} tone="green" />
      <AdminStatCard label="Équipes" value={stats.teams} detail="périmètres opérationnels" icon={UsersRound} tone="amber" />
      <AdminStatCard label="Files actives" value={stats.queues} detail="routage disponible" icon={Inbox} tone="slate" />
    </section>
    <section className="admin-modern-main-grid" aria-label="Vue d&apos;ensemble administration"><AdminUsersTable count={stats.users} /><AdminSettingsCard /></section>
    <section className="admin-modern-resource-grid" aria-label="Ressources administration"><AdminTeamCard count={stats.teams} /><AdminQueueCard count={stats.queues} /><AdminCalendarCard /><AdminNotificationCard count={stats.notificationRules} /></section>
  </div>;
}

export default AdminDashboard;
