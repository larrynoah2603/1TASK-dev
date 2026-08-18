import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { assignAdminRole } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const { id } = await context.params;
    return NextResponse.json(await assignAdminRole(actor, id, await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
