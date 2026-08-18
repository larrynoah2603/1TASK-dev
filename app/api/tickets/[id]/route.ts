import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getTicketForViewer } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const ticket = await getTicketForViewer(actor, id);
    return NextResponse.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}
