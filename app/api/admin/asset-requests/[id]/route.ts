import { NextResponse } from "next/server";
import { reviewAssetRequest } from "@/lib/asset-request-service";
import { errorResponse } from "@/lib/http";
import { requireSessionUserContext } from "@/lib/server-auth";
import { assetRequestReviewSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await params;
    const result = await reviewAssetRequest(actor, id, assetRequestReviewSchema.parse(await request.json()));
    return NextResponse.json(result);
  } catch (error) { return errorResponse(error); }
}
