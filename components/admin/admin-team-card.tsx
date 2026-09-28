import Link from "next/link";

export function AdminTeamCard({ count }: { count: number }) {
  return <article className="admin-modern-card admin-modern-resource-card"><div className="admin-modern-resource-icon admin-modern-resource-icon-primary">T</div><div><p className="admin-modern-kicker">Organisation</p><h2>Équipes</h2><p>{count} équipes actives et leurs agents.</p></div><Link href="/admin/teams" aria-label="Gérer les équipes">→</Link></article>;
}
