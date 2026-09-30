import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { AdminServiceError } from "@/lib/admin-service";
import { deletionEntityTypes, getDeletionImpact, type DeletionEntityType } from "@/lib/services/deletion-impact.service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    await requireAdminAccess("FUNCTIONAL");
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType")?.toUpperCase() as DeletionEntityType | undefined;
    const entityId = url.searchParams.get("entityId");
    if (!entityType || !deletionEntityTypes.includes(entityType) || !entityId) throw new AdminServiceError("Type ou identifiant de dépendance invalide.", 422);
    const impact = await getDeletionImpact({ entityType, entityId });
    if (!impact) throw new AdminServiceError("Élément introuvable.", 404);
    return NextResponse.json(impact, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
