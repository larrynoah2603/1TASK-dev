import { NextResponse } from "next/server";
import { getAdminConfiguration, saveSla } from "@/lib/admin-service";
import { errorResponse } from "@/lib/http";
import { requireAdminAccess } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const configuration = await getAdminConfiguration(actor, ["sla"]);
    return NextResponse.json(configuration.slas, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const sla = await saveSla(actor, undefined, await request.json());
    return NextResponse.json(sla, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
