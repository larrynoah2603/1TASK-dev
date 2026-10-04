import { AssetDetailContent } from "@/app/(app)/assets/[id]/page";

export default async function AdminAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return AssetDetailContent({ id: (await params).id, basePath: "/admin/assets" });
}
