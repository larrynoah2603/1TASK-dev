import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import { listTicketAssignmentOptions, listTicketTransferOptions } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind === "assign") {
      return NextResponse.json({ agents: await listTicketAssignmentOptions(actor, id) });
    }
    if (kind === "transfer") {
      return NextResponse.json({ queues: await listTicketTransferOptions(actor, id) });
    }
    return apiErrorResponse({
      message: "Type d’options invalide.",
      code: "VALIDATION_ERROR",
      status: 400,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
