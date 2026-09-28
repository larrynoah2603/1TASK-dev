import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function AdminHeader() {
  return <header className="admin-modern-header"><div><p className="admin-modern-kicker">Console d&apos;administration</p><h1>Admin Overview</h1><p>Supervisez les accès, les équipes et la structure opérationnelle de 1TASK.</p></div><Link href="/admin/users" className="admin-modern-header-action">Gérer les utilisateurs <ArrowUpRight aria-hidden="true" /></Link></header>;
}
