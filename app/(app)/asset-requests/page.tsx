import { redirect } from "next/navigation";
import { AssetRequestReviewTable } from "@/components/asset-request-review-table";
import { isFunctionalAssetAdministrator } from "@/lib/asset-access";
import { listAssetRequestsForReview } from "@/lib/asset-request-service";
import { getSessionUserContext } from "@/lib/server-auth";

export default async function AssetRequestsPage() {
  const user = await getSessionUserContext();
  if (!user || !isFunctionalAssetAdministrator(user)) redirect("/dashboard");
  const { requests, availableAssets } = await listAssetRequestsForReview(user);
  return <main className="asset-review-page"><header className="saas-page-header"><div><p className="eyebrow">Administration fonctionnelle</p><h1>Demandes d’actifs</h1><p className="page-header-description">Validez les besoins, attribuez un actif disponible ou motivez votre refus.</p></div><div className="header-stat"><strong>{requests.filter((request) => request.status === "PENDING").length}</strong><span>à traiter</span></div></header><AssetRequestReviewTable requests={requests.map((request) => ({ ...request, createdAt: request.createdAt.toISOString(), approvedAt: request.approvedAt?.toISOString() ?? null, updatedAt: request.updatedAt.toISOString() }))} availableAssets={availableAssets} /></main>;
}
