import { AssetRequestDialog } from "@/components/asset-request-dialog";
import { getRequesterAssetAvailability, listMyAssetRequests, listMyAssets } from "@/lib/asset-request-service";
import { getSessionUserContext } from "@/lib/server-auth";
import { ActivityIcon } from "@/components/activity-icon";
import { Laptop, Smartphone, Package } from "lucide-react";

const typeLabels: Record<string, string> = { COMPUTER: "Ordinateur", SCREEN: "Écran", PHONE: "Téléphone", ACCESSORY: "Accessoire", LICENSE: "Licence", OTHER: "Autre" };
const statusLabels: Record<string, string> = { ACTIVE: "Actif", IN_REPAIR: "En réparation", RETIRED: "Retiré", LOST: "Perdu" };
const requestLabels: Record<string, string> = { PENDING: "En validation", APPROVED: "Approuvée", REJECTED: "Refusée" };
const requestDisplay = (request: { status: string; asset: { assetTag: string; name: string } | null }) => request.status === "APPROVED"
  ? request.asset ? "Attribuée" : "Approuvée · attente de stock"
  : requestLabels[request.status] ?? request.status;
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("fr-FR").format(value) : "Non renseignée";

export default async function MyAssetsPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const [assets, requests, availability] = await Promise.all([listMyAssets(user), listMyAssetRequests(user), getRequesterAssetAvailability(user)]);
  return <div className="asset-self-service-page">
    <header className="saas-page-header"><div><p className="eyebrow">Espace personnel</p><h1>Mes actifs</h1><p className="page-header-description">Consultez uniquement le matériel qui vous est attribué et suivez vos demandes.</p></div><AssetRequestDialog availability={availability} /></header>
    <section aria-labelledby="assigned-assets-title"><div className="section-heading"><div><h2 id="assigned-assets-title">Matériel attribué</h2><p>{assets.length} actif{assets.length > 1 ? "s" : ""} associé{assets.length > 1 ? "s" : ""} à votre compte.</p></div></div>
      <div className="asset-card-grid">{assets.map((asset) => <article className="saas-card personal-asset-card" key={asset.id}><div className="asset-card-icon" aria-hidden="true">{asset.type === "PHONE" ? <Smartphone aria-hidden="true" /> : asset.type === "COMPUTER" ? <Laptop aria-hidden="true" /> : <Package aria-hidden="true" />}</div><div className="asset-card-main"><div className="asset-card-title"><div><p className="eyebrow">{typeLabels[asset.type]}</p><h3>{asset.name}</h3></div><span className={`status-chip status-chip-${asset.status.toLowerCase()}`}>{statusLabels[asset.status]}</span></div><dl><div><dt>Numéro d’inventaire</dt><dd>{asset.assetTag}</dd></div><div><dt>Numéro de série</dt><dd>{asset.serialNumber ?? "Non renseigné"}</dd></div><div><dt>Date d’attribution</dt><dd>{date(asset.assignedAt)}</dd></div></dl></div></article>)}{!assets.length ? <div className="saas-card empty-state"><h3>Aucun actif attribué</h3><p>Votre matériel apparaîtra ici après validation et attribution. Pour en demander un, utilisez « Demander un actif » en haut de la page.</p></div> : null}</div>
    </section>
    <section aria-labelledby="my-requests-title"><div className="section-heading"><div><h2 id="my-requests-title">Mes demandes récentes</h2><p>En validation = décision attendue · Approuvée = accord obtenu · Attribuée = matériel effectivement remis.</p></div></div><div className="saas-card request-list">{requests.map((request) => { const display = requestDisplay(request); return <article key={request.id}><ActivityIcon type={request.status} label={`Demande ${display.toLowerCase()}`} /><div><strong>{typeLabels[request.assetType]}</strong><p>{request.reason}</p>{request.asset ? <small>Attribué : {request.asset.assetTag} · {request.asset.name}</small> : null}{request.rejectedReason ? <small>Motif du refus : {request.rejectedReason}</small> : null}</div><div><span className={`request-status request-status-${request.status.toLowerCase()}`}>{display}</span><time>{date(request.createdAt)}</time></div></article>; })}{!requests.length ? <p className="table-empty">Aucune demande envoyée.</p> : null}</div></section>
  </div>;
}
