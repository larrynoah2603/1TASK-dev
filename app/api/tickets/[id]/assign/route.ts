import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import { assignTicket } from "@/lib/ticket-service";
import { requirePermission } from "@/lib/server-auth";
import { assignmentSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission("ticket:assign");

    const { id } = await context.params;

    const payload = assignmentSchema.parse(
      await request.json(),
    );
       if (!id || id.trim().length === 0) {
  return apiErrorResponse({ message: "Identifiant ticket invalide.", code: "INVALID_IDENTIFIER", status: 400 });
}
    const ticket = await assignTicket(
      actor,
      id,
      payload,
    );

    return NextResponse.json(ticket);

  } catch (error) {
    return errorResponse(error);
  }
}