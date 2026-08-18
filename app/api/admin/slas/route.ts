import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getAdminConfiguration, saveSla } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const configuration = await getAdminConfiguration(actor);
    return NextResponse.json({ slas: configuration.slas, calendars: configuration.calendars });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json(await saveSla(actor, undefined, await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
