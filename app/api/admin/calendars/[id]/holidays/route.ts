import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveHoliday } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const { id } = await params;
    return NextResponse.json(await saveHoliday(actor, id, await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
