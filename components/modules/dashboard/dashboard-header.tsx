import Link from "next/link";
import { DashboardViewTabs } from "@/components/dashboard-visuals";

export function DashboardHeader({ firstName, canOperate, canReport }: { firstName: string; canOperate: boolean; canReport: boolean }) {
  return <><DashboardViewTabs active="requester" canOperate={canOperate} canReport={canReport} /><header className="dashboard-hero dashboard-role-hero"><div><p className="eyebrow">Votre espace de support</p><h1>Bonjour {firstName} <span aria-hidden="true">👋</span></h1><p className="page-header-description">Suivez vos incidents en temps réel et retrouvez rapidement les dernières mises à jour.</p></div><div className="flex flex-wrap gap-2"><Link href="/tickets" className="button-secondary">Voir mes tickets</Link><Link href="/tickets/new" className="button-primary">+ Créer un incident</Link></div></header></>;
}
