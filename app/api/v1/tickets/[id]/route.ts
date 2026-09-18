import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse, withApiObservability } from "@/lib/http";
import { toTicketDetailDTO } from "@/lib/mappers/ticket.mapper";
import { requireSessionUserContext } from "@/lib/server-auth";
import { getTicketForViewer } from "@/lib/ticket-detail-service";

export const dynamic = "force-dynamic";

async function getTicket(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    if (!id.trim()) {
      return apiErrorResponse({ message: "Identifiant ticket invalide.", code: "INVALID_IDENTIFIER", status: 400 });
    }
    return NextResponse.json(toTicketDetailDTO(await getTicketForViewer(actor, id)));
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withApiObservability("/api/v1/tickets/:id", getTicket);
