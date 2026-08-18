import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { qualifyTicket } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { ticketQualificationSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const ticket = await qualifyTicket(actor, id, ticketQualificationSchema.parse(await request.json()));
    return NextResponse.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}
