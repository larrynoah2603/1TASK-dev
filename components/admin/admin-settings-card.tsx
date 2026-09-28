import Link from "next/link";

export function AdminSettingsCard() {
  return <article className="admin-modern-card admin-modern-settings-card"><div><p className="admin-modern-kicker">Configuration</p><h2>Paramètres actifs</h2><p>Gérez les règles qui structurent l&apos;expérience de support.</p></div><div className="admin-modern-settings-list"><Link href="/admin/notifications"><span className="admin-setting-dot admin-setting-dot-primary" />Notifications <b>→</b></Link><Link href="/admin/sla"><span className="admin-setting-dot admin-setting-dot-amber" />SLA et escalades <b>→</b></Link><Link href="/admin/technical"><span className="admin-setting-dot admin-setting-dot-green" />Configuration technique <b>→</b></Link></div></article>;
}
