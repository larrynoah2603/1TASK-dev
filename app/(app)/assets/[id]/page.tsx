import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { AssetDetailActions } from "@/components/asset-detail-actions";
import { StatusBadge } from "@/components/status-badge";
import { isFunctionalAssetAdministrator } from "@/lib/asset-access";
import { getAssetForViewer, listAssetMoveTargets } from "@/lib/production-service";
import { getSessionUserContext } from "@/lib/server-auth";
import { getProductCapabilities } from "@/lib/product-policy.server";

const typeLabels: Record<string, string> = { COMPUTER: "Ordinateur", SCREEN: "Écran", PHONE: "Téléphone", ACCESSORY: "Accessoire", LICENSE: "Licence", OTHER: "Autre" };
const statusLabels: Record<string, string> = { ACTIVE: "Actif", IN_REPAIR: "En réparation", RETIRED: "Retiré", LOST: "Perdu" };
function formatDate(value: Date | null | undefined) { return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(value) : "Non définie"; }
function formatDateTime(value: Date) { return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value); }

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!getProductCapabilities().productionPortfolio) redirect(`/admin/assets/${id}`);
  return AssetDetailContent({ id });
}

export async function AssetDetailContent({ id, basePath = "/assets" }: { id: string; basePath?: string }) {
  const user = await getSessionUserContext();
  if (!user) return null;
  const isFunctionalAdmin = isFunctionalAssetAdministrator(user);
  if (!isFunctionalAdmin) redirect("/dashboard");
  const canManage = true;
  let asset;
  try { asset = await getAssetForViewer(user, id); } catch { notFound(); }
  if (!asset) notFound();
  const targets = canManage ? await listAssetMoveTargets(user) : { departments: [], users: [] };

  return <div className="space-y-5 assets-page-shell assets-detail-page-shell assets-industrial"><div><Link href={basePath as Route} className="text-xs font-semibold operational-link hover:underline">← Retour aux actifs</Link><header className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><p className="eyebrow">Référentiel technique · {asset.assetTag}</p><h1 className="mt-1">{asset.name}</h1><p className="page-header-description mt-1">{typeLabels[asset.type] ?? asset.type}{asset.serialNumber ? ` · N° de série ${asset.serialNumber}` : ""}</p></div><div className="flex flex-wrap items-start gap-2"><span className={`status-chip status-chip-${asset.status.toLowerCase()}`}>{statusLabels[asset.status] ?? asset.status}</span><AssetDetailActions assetId={asset.id} canManage={canManage} departments={targets.departments} users={targets.users} currentDepartmentId={asset.departmentId} currentUserId={asset.assignedToId} /></div></header></div>

    <section className="asset-detail-highlights grid gap-3" aria-label="Synthèse de l’actif"><div className="metric-card"><p className="text-xs text-[var(--kit-text-2)]">État</p><p className="mt-1 text-xl font-bold tracking-tight text-[var(--kit-text)]">{statusLabels[asset.status] ?? asset.status}</p><p className="mt-1 text-xs text-[var(--kit-text-2)]">Dernière mise à jour le {formatDate(asset.updatedAt)}</p></div><div className="metric-card"><p className="text-xs text-[var(--kit-text-2)]">Département</p><p className="mt-1 text-xl font-bold tracking-tight text-[var(--kit-text)]">{asset.department?.name ?? "Non rattaché"}</p><p className="mt-1 text-xs text-[var(--kit-text-2)]">Périmètre opérationnel</p></div><div className="metric-card"><p className="text-xs text-[var(--kit-text-2)]">Affectation</p><p className="mt-1 text-xl font-bold tracking-tight text-[var(--kit-text)]">{asset.assignedTo?.name ?? "Non affecté"}</p><p className="mt-1 text-xs text-[var(--kit-text-2)]">{asset.assignedTo?.email ?? "Aucun utilisateur"}</p></div>{asset.type === "LICENSE" ? <div className="metric-card"><p className="text-xs text-[var(--kit-text-2)]">Licence</p><p className="mt-1 text-xl font-bold tracking-tight text-[var(--kit-text)]">{formatDate(asset.licenseExpiresAt)}</p><p className="mt-1 text-xs text-[var(--kit-text-2)]">Échéance renseignée</p></div> : null}</section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"><section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--kit-border)] px-4 py-3 sm:px-5"><div><p className="eyebrow">Traçabilité</p><h2 className="mt-1 text-base font-semibold text-[var(--kit-text)]">Historique des mouvements</h2></div><span className="text-xs text-[var(--kit-text-2)]">{asset.movements.length} mouvement(s)</span></div><div className="divide-y divide-[var(--kit-border)]">{asset.movements.map((movement) => <div key={movement.id} className="px-4 py-3 sm:px-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[var(--kit-text)]">{movement.fromUser?.name ?? movement.fromDepartment?.name ?? "Non affecté"} <span className="text-[var(--kit-text-2)]">→</span> {movement.toUser?.name ?? movement.toDepartment?.name ?? "Non affecté"}</p><p className="mt-1 text-xs text-[var(--kit-text-2)]">{movement.reason}</p></div><p className="shrink-0 text-xs text-[var(--kit-text-2)]">{formatDateTime(movement.movedAt)}</p></div><p className="mt-1 text-xs text-[var(--kit-text-2)]">Enregistré par {movement.createdBy?.name ?? "Système"}</p></div>)}{!asset.movements.length ? <p className="px-5 py-10 text-center text-sm text-[var(--kit-text-2)]">Aucun mouvement enregistré pour cet actif.</p> : null}</div></section>
      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--kit-border)] px-4 py-3 sm:px-5"><div><p className="eyebrow">Service desk</p><h2 className="mt-1 text-base font-semibold text-[var(--kit-text)]">Tickets liés</h2></div><span className="text-xs text-[var(--kit-text-2)]">{asset.tickets.length} ticket(s)</span></div><div className="overflow-x-auto" role="region" aria-label="Tickets liés, tableau défilant" tabIndex={0}><table className="data-table min-w-[580px]"><thead><tr><th>Ticket</th><th>État</th><th>Créé le</th></tr></thead><tbody>{asset.tickets.map((ticket) => <tr key={ticket.id}><td><Link href={`/tickets/${ticket.id}` as Route} className="font-semibold operational-link hover:underline">{ticket.reference}</Link><p className="mt-0.5 max-w-[220px] truncate text-xs text-[var(--kit-text-2)]">{ticket.title}</p></td><td><StatusBadge status={ticket.status} /></td><td className="text-xs text-[var(--kit-text-2)]">{formatDate(ticket.createdAt)}</td></tr>)}{!asset.tickets.length ? <tr><td colSpan={3} className="py-10 text-center text-sm text-[var(--kit-text-2)]">Aucun ticket rattaché à cet actif.</td></tr> : null}</tbody></table></div></section></div>

    <section className="panel p-4 sm:p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Référentiel</p><h2 className="mt-1 text-base font-semibold text-[var(--kit-text)]">Informations de l’actif</h2></div><span className="font-mono text-xs text-[var(--kit-text-2)]">{asset.id}</span></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-[var(--kit-text-2)]">Tag inventaire</dt><dd className="mt-1 font-mono text-xs font-semibold text-[var(--kit-text)]">{asset.assetTag}</dd></div><div><dt className="text-xs text-[var(--kit-text-2)]">Type</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{typeLabels[asset.type] ?? asset.type}</dd></div><div><dt className="text-xs text-[var(--kit-text-2)]">Numéro de série</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{asset.serialNumber ?? "Non renseigné"}</dd></div><div><dt className="text-xs text-[var(--kit-text-2)]">Créé le</dt><dd className="mt-1 font-semibold text-[var(--kit-text)]">{formatDate(asset.createdAt)}</dd></div></dl></section>
  </div>;
}
