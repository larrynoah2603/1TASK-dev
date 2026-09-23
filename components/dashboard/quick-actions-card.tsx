import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Inbox, ListTodo, Plus, BarChart3 } from "lucide-react";

export function QuickActionsCard({ canOperate, canReport }: { canOperate: boolean; canReport: boolean }) {
  const actions = [{ href: "/tickets/new", label: "Créer un ticket", icon: Plus, visible: true }, { href: "/tickets", label: "Voir mes tickets", icon: ListTodo, visible: true }, { href: "/inbox", label: "Ouvrir inbox", icon: Inbox, visible: canOperate }, { href: "/reporting", label: "Voir reporting", icon: BarChart3, visible: canReport }];
  return <section className="dashboard-enterprise-card" aria-labelledby="dashboard-actions-title"><div className="dashboard-enterprise-card-header"><div><p className="eyebrow">Raccourcis</p><h2 id="dashboard-actions-title">Actions rapides</h2></div></div><div className="dashboard-quick-actions">{actions.filter((action) => action.visible).map(({ href, label, icon: Icon }) => <Link key={href} href={href as Route} className="dashboard-quick-action"><span><Icon aria-hidden />{label}</span><ArrowUpRight aria-hidden /></Link>)}</div></section>;
}
