import { NextResponse } from "next/server";
import { createAssetRequest, listMyAssetRequests } from "@/lib/asset-request-service";
import { errorResponse } from "@/lib/http";
import { requireSessionUserContext } from "@/lib/server-auth";
import { assetRequestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireSessionUserContext();
    return NextResponse.json({ requests: await listMyAssetRequests(actor) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const created = await createAssetRequest(actor, assetRequestSchema.parse(await request.json()));
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
