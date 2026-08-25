import { redirect } from "next/navigation";
import { AssetListClient } from "@/components/asset-list-client";
import { isFunctionalAssetAdministrator } from "@/lib/asset-access";
import { listAssetMoveTargets, listAssetsForViewer } from "@/lib/production-service";
import { getSessionUserContext } from "@/lib/server-auth";

export default async function AssetsPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const isFunctionalAdmin = isFunctionalAssetAdministrator(user);
  if (!isFunctionalAdmin) redirect("/dashboard");
  const canManage = true;
  const [assets, targets] = await Promise.all([
    listAssetsForViewer(user),
    canManage ? listAssetMoveTargets(user) : Promise.resolve({ departments: [], users: [] }),
  ]);

  return <div className="space-y-5"><header className="page-header"><div><p className="eyebrow">Référentiel technique</p><h1 className="mt-1">Actifs</h1><p className="page-header-description mt-1">Suivez les équipements, licences, affectations et états visibles dans votre périmètre.</p></div></header><AssetListClient initialAssets={assets.map((asset) => ({ ...asset, licenseExpiresAt: asset.licenseExpiresAt?.toISOString() ?? null }))} departments={targets.departments} users={targets.users} canManage={canManage} /></div>;
}
