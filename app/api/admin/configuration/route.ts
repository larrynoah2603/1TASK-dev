import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json(await getAdminConfiguration(actor));
  } catch (error) {
    return errorResponse(error);
  }
}
