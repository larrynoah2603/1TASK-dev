import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveNotificationRule } from "@/lib/admin-notification-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const { id } = await context.params;
    return NextResponse.json(await saveNotificationRule(actor, id, await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}
