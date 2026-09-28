import Link from "next/link";

export function AdminNotificationCard({ count }: { count: number }) {
  return <article className="admin-modern-card admin-modern-mini-card"><div className="admin-modern-mini-icon admin-modern-mini-icon-orange">N</div><div><h2>Notifications</h2><p>{count} règle{count > 1 ? "s" : ""} active{count > 1 ? "s" : ""}</p></div><Link href="/admin/notifications" aria-label="Configurer les notifications">→</Link></article>;
}
