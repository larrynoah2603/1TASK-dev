import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const configuration = await getAdminConfiguration(actor);
    return NextResponse.json(configuration.users, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
