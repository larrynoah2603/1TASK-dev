import { redirect } from "next/navigation";
import { AssetRequestReviewTable } from "@/components/asset-request-review-table";
import { isFunctionalAssetAdministrator } from "@/lib/asset-access";
import { listAssetRequestsForReview } from "@/lib/asset-request-service";
import { getSessionUserContext } from "@/lib/server-auth";
import { getProductCapabilities } from "@/lib/product-policy.server";

export default async function AssetRequestsPage() {
  if (!getProductCapabilities().productionPortfolio) redirect("/admin/asset-requests");
  return AssetRequestsContent();
}

export async function AssetRequestsContent() {
  const user = await getSessionUserContext();
  if (!user || !isFunctionalAssetAdministrator(user)) redirect("/dashboard");
  const { requests, availableAssets } = await listAssetRequestsForReview(user);
  const actionableCount = requests.filter((request) =>
    request.status === "PENDING" || (request.status === "APPROVED" && !request.assetId)
  ).length;
  return <main className="asset-review-page"><header className="saas-page-header"><div><p className="eyebrow">Administration fonctionnelle</p><h1>Demandes d’actifs</h1><p className="page-header-description">Validez chaque besoin, puis attribuez un actif disponible depuis l’inventaire. Une demande approuvée peut rester en attente de stock.</p></div><div className="header-stat"><strong>{actionableCount}</strong><span>à valider / attribuer</span></div></header><AssetRequestReviewTable requests={requests.map((request) => ({ ...request, createdAt: request.createdAt.toISOString(), approvedAt: request.approvedAt?.toISOString() ?? null, updatedAt: request.updatedAt.toISOString() }))} availableAssets={availableAssets} /></main>;
}
