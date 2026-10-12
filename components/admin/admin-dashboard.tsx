import Link from "next/link";
import type { Route } from "next";
import { Users, Building2, UsersRound, Inbox, ShieldCheck, ArrowUpRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export type AdminDashboardStats = { users: number; departments: number; teams: number; queues: number };

const sections = [
  { href: "/admin/users", label: "Utilisateurs", description: "Identités, rôles et habilitations", icon: Users },
  { href: "/admin/departments", label: "Départements", description: "Organisation et correspondance Entra", icon: Building2 },
  { href: "/admin/teams", label: "Équipes", description: "Responsables et agents", icon: UsersRound },
  { href: "/admin/queues", label: "Files de tickets", description: "Routage, managers et SLA", icon: Inbox },
];

export function AdminDashboard({ stats }: { stats: AdminDashboardStats }) {
  return (
    <div className="admin-console-page">
      <header className="admin-console-header">
        <div><p className="eyebrow">Console d’administration</p><h2 className="admin-console-heading">Vue d’ensemble</h2><p>Supervisez la structure 1TASK, les accès et les périmètres opérationnels.</p></div>
        <div className="admin-console-header-actions"><Link href="/admin/users" className="button-primary">Gérer les utilisateurs</Link></div>
      </header>
      <section className="admin-console-kpis" aria-label="Indicateurs administration">
        <StatCard title="Utilisateurs actifs" value={stats.users} description="Identités synchronisées" iconComponent={Users} tone="info" />
        <StatCard title="Départements" value={stats.departments} description="Organisation active" iconComponent={Building2} tone="success" />
        <StatCard title="Équipes" value={stats.teams} description="Périmètres opérationnels" iconComponent={UsersRound} tone="warning" />
        <StatCard title="Files actives" value={stats.queues} description="Routage disponible" iconComponent={Inbox} tone="neutral" />
      </section>
      <section className="admin-console-grid" aria-label="Accès administration">
        <div className="admin-console-card"><div className="admin-console-card-heading"><div><p className="eyebrow">Gouvernance</p><h2>Gestion structurée</h2></div><ShieldCheck aria-hidden="true" /></div><div className="admin-console-links">{sections.map((section) => <Link key={section.href} href={section.href as Route}><span><strong>{section.label}</strong><small>{section.description}</small></span><ArrowUpRight aria-hidden="true" /></Link>)}</div></div>
        <div className="admin-console-card admin-console-guardrails"><p className="eyebrow">Sécurité</p><h2>Accès et traçabilité</h2><p>Les vues sont filtrées par les autorisations serveur existantes. Les modifications restent exécutées par les APIs d’administration et historisées.</p><Link href="/admin/audit" className="button-secondary">Ouvrir le journal d’audit</Link></div>
      </section>
    </div>
  );
}

export default AdminDashboard;
