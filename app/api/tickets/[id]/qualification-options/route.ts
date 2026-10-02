import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireSessionUserContext } from "@/lib/server-auth";
import { listQualificationDestinationServices } from "@/lib/ticket-workflow-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    return NextResponse.json({ services: await listQualificationDestinationServices(actor, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
