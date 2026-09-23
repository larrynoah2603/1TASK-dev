import Link from "next/link";
import { DashboardViewTabs } from "@/components/dashboard-visuals";

export function DashboardHeader({ firstName, canOperate, canReport }: { firstName: string; canOperate: boolean; canReport: boolean }) {
  return <><DashboardViewTabs active="requester" canOperate={canOperate} canReport={canReport} /><header className="dashboard-hero dashboard-role-hero dashboard-reference-header"><div><p className="eyebrow">Votre espace de support</p><h1>Bonjour {firstName}</h1><p className="page-header-description">Voici un aperçu de votre activité aujourd&apos;hui.</p></div><div className="dashboard-reference-actions"><Link href="/tickets" className="button-secondary">Voir mes tickets</Link><Link href="/tickets/new" className="button-primary">Créer un ticket</Link></div></header></>;
}
