import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { addTicketMessage } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { addMessageSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const message = await addTicketMessage(actor, id, addMessageSchema.parse(await request.json()));
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
