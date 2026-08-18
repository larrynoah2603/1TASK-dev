import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveQueue } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json(await saveQueue(actor, undefined, await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
