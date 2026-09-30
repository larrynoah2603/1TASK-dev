import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { deleteQueue, saveQueue } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const { id } = await context.params;
    return NextResponse.json(await saveQueue(actor, id, await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}


export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const { id } = await context.params;
    const payload = await request.json();
    return NextResponse.json(await deleteQueue(actor, id, payload.reason));
  } catch (error) {
    return errorResponse(error);
  }
}
