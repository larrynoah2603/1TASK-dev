import { NextResponse } from "next/server";
import { listMyAssets } from "@/lib/asset-request-service";
import { errorResponse } from "@/lib/http";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireSessionUserContext();
    return NextResponse.json({ assets: await listMyAssets(actor) });
  } catch (error) {
    return errorResponse(error);
  }
}
