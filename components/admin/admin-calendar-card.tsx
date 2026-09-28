import Link from "next/link";

export function AdminCalendarCard() {
  return <article className="admin-modern-card admin-modern-mini-card"><div className="admin-modern-mini-icon admin-modern-mini-icon-accent">C</div><div><h2>Calendrier</h2><p>Horaires et jours ouvrés</p></div><Link href="/admin/technical" aria-label="Configurer le calendrier">→</Link></article>;
}
