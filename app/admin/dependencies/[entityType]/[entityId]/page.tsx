import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-primitives";
import { deletionEntityTypes, getDeletionImpact, type DeletionEntityType } from "@/lib/services/deletion-impact.service";
import { requireAdminAccess } from "@/lib/server-auth";

const labels: Record<DeletionEntityType, string> = { USER: "Utilisateur", DEPARTMENT: "Département", QUEUE: "File", TEAM: "Équipe", CATALOG_ITEM: "Service catalogue" };
export default async function DependencyPage({ params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  await requireAdminAccess("FUNCTIONAL");
  const raw = await params;
  const entityType = raw.entityType.toUpperCase() as DeletionEntityType;
  if (!deletionEntityTypes.includes(entityType)) notFound();
  const impact = await getDeletionImpact({ entityType, entityId: raw.entityId });
  if (!impact) notFound();
  const history = impact.blockers.filter((item) => item.protectedHistory);
  const configuration = impact.blockers.filter((item) => !item.protectedHistory);
  return <div className="space-y-6"><AdminPageHeader eyebrow="Explorateur de dépendances" title={impact.entityName} description={`${labels[entityType]} · ${impact.canDelete ? "DELETABLE" : "BLOCKED"} · ${impact.totalBlockers} dépendance(s)`} />
    {[{ title: "Configuration à détacher ou réaffecter", items: configuration }, { title: "Historique métier protégé", items: history }].map((group) => group.items.length ? <section key={group.title} className="panel p-5"><h2 className="text-lg font-semibold">{group.title}</h2><div className="mt-4 space-y-2">{group.items.map((item) => <details key={item.type} className="rounded-lg border border-slate-200 p-4" open><summary className="cursor-pointer font-semibold">{item.label} · {item.count}</summary><p className="mt-2 text-sm text-slate-600">Résolution recommandée : {item.resolution === "HISTORY_PROTECTED" ? "désactiver ou archiver l’entité ; ne jamais supprimer l’historique" : item.resolution.toLowerCase()}</p><Link className="button-secondary mt-3 inline-flex" href={item.adminPath as Route}>Voir les éléments concernés</Link></details>)}</div></section> : null)}
    {impact.canDelete ? <section className="panel border-emerald-200 p-5 text-emerald-800">Aucune dépendance ne bloque la suppression.</section> : null}
  </div>;
}
