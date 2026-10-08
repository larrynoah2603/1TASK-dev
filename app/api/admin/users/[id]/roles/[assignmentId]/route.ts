import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { removeAdminRoleAssignment } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; assignmentId: string }> },
) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const { id, assignmentId } = await context.params;
    return NextResponse.json(
      await removeAdminRoleAssignment(actor, id, assignmentId, await request.json()),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
