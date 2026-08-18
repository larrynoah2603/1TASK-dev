import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { assignTicket } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { assignmentSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const ticket = await assignTicket(actor, id, assignmentSchema.parse(await request.json()));
    return NextResponse.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}
