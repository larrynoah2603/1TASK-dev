import Link from "next/link";

export function AdminQueueCard({ count }: { count: number }) {
  return <article className="admin-modern-card admin-modern-resource-card"><div className="admin-modern-resource-icon admin-modern-resource-icon-green">F</div><div><p className="admin-modern-kicker">Routage</p><h2>Files de tickets</h2><p>{count} files actives, responsables et SLA associés.</p></div><Link href="/admin/queues" aria-label="Gérer les files">→</Link></article>;
}
