import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveTeam } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json(await saveTeam(actor, undefined, await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
