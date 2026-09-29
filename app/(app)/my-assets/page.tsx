import { AssetRequestDialog } from "@/components/asset-request-dialog";
import { listMyAssetRequests, listMyAssets } from "@/lib/asset-request-service";
import { getSessionUserContext } from "@/lib/server-auth";

const typeLabels: Record<string, string> = { COMPUTER: "Ordinateur", SCREEN: "Écran", PHONE: "Téléphone", ACCESSORY: "Accessoire", LICENSE: "Licence", OTHER: "Autre" };
const statusLabels: Record<string, string> = { ACTIVE: "Actif", IN_REPAIR: "En réparation", RETIRED: "Retiré", LOST: "Perdu" };
const requestLabels: Record<string, string> = { PENDING: "En validation", APPROVED: "Approuvée", REJECTED: "Refusée" };
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("fr-FR").format(value) : "Non renseignée";

export default async function MyAssetsPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const [assets, requests] = await Promise.all([listMyAssets(user), listMyAssetRequests(user)]);
  return <main className="asset-self-service-page">
    <header className="saas-page-header"><div><p className="eyebrow">Espace personnel</p><h1>Mes actifs</h1><p className="page-header-description">Consultez uniquement le matériel qui vous est attribué et suivez vos demandes.</p></div><AssetRequestDialog /></header>
    <section aria-labelledby="assigned-assets-title"><div className="section-heading"><div><h2 id="assigned-assets-title">Matériel attribué</h2><p>{assets.length} actif{assets.length > 1 ? "s" : ""} associé{assets.length > 1 ? "s" : ""} à votre compte.</p></div></div>
      <div className="asset-card-grid">{assets.map((asset) => <article className="saas-card personal-asset-card" key={asset.id}><div className="asset-card-icon" aria-hidden="true">{asset.type === "PHONE" ? "▯" : "▰"}</div><div className="asset-card-main"><div className="asset-card-title"><div><p className="eyebrow">{typeLabels[asset.type]}</p><h3>{asset.name}</h3></div><span className={`request-status request-status-${asset.status === "ACTIVE" ? "approved" : "pending"}`}>{statusLabels[asset.status]}</span></div><dl><div><dt>Numéro d’inventaire</dt><dd>{asset.assetTag}</dd></div><div><dt>Numéro de série</dt><dd>{asset.serialNumber ?? "Non renseigné"}</dd></div><div><dt>Date d’attribution</dt><dd>{date(asset.assignedAt)}</dd></div></dl></div></article>)}{!assets.length ? <div className="saas-card empty-state"><h3>Aucun actif attribué</h3><p>Votre matériel apparaîtra ici après validation et attribution.</p><AssetRequestDialog compact /></div> : null}</div>
    </section>
    <section aria-labelledby="my-requests-title"><div className="section-heading"><div><h2 id="my-requests-title">Mes demandes récentes</h2><p>Le traitement et la décision restent visibles à chaque étape.</p></div></div><div className="saas-card request-list">{requests.map((request) => <article key={request.id}><div><strong>{typeLabels[request.assetType]}</strong><p>{request.reason}</p>{request.rejectedReason ? <small>Motif du refus : {request.rejectedReason}</small> : null}</div><div><span className={`request-status request-status-${request.status.toLowerCase()}`}>{requestLabels[request.status]}</span><time>{date(request.createdAt)}</time></div></article>)}{!requests.length ? <p className="table-empty">Aucune demande envoyée.</p> : null}</div></section>
  </main>;
}
