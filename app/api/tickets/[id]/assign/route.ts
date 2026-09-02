import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
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
  return NextResponse.json(
    {
      error: "Identifiant ticket invalide."
    },
    {
      status:400
    }
  );
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