import Link from "next/link";

export function AdminUsersTable({ count }: { count: number }) {
  return <section className="admin-modern-card admin-modern-users"><div className="admin-modern-card-heading"><div><p className="admin-modern-kicker">Accès et identités</p><h2>Utilisateurs</h2></div><Link href="/admin/users">Voir tous <span aria-hidden="true">→</span></Link></div><div className="admin-modern-table-note"><span className="admin-modern-avatar">U</span><div><strong>{count} utilisateurs actifs</strong><small>Rôles et affectations administrés depuis la console.</small></div><Link href="/admin/users" className="admin-modern-row-action">Modifier</Link></div></section>;
}
