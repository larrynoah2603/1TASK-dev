import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { transferTicket } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { queueTransferSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const ticket = await transferTicket(
      actor,
      id,
      queueTransferSchema.parse(body),
    );
    return NextResponse.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}
