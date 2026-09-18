import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import { requireApiPermission } from "@/lib/api-auth";
import { toTicketDetailDTO } from "@/lib/mappers/ticket.mapper";
import { withPublicApiV1 } from "@/lib/public-api";
import { getTicketForViewer } from "@/lib/ticket-detail-service";

export const dynamic = "force-dynamic";

async function getTicket(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireApiPermission(request, "ticket:read");
    const { id } = await context.params;
    if (!id.trim()) {
      return apiErrorResponse({ message: "Identifiant ticket invalide.", code: "INVALID_IDENTIFIER", status: 400 });
    }
    return NextResponse.json(toTicketDetailDTO(await getTicketForViewer(actor, id)));
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withPublicApiV1("/api/v1/tickets/:id", getTicket);
