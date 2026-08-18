import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getAdminConfiguration, saveCatalogItem } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const configuration = await getAdminConfiguration(actor);
    return NextResponse.json(configuration.services);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json(await saveCatalogItem(actor, undefined, await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
