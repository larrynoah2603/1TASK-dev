import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { updateHoliday } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const { id } = await params;
    return NextResponse.json(await updateHoliday(actor, id, await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}
