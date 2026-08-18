import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { createTicketLink, listTicketLinksForViewer } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { ticketLinkSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    return NextResponse.json({ links: await listTicketLinksForViewer(actor, id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const link = await createTicketLink(actor, id, ticketLinkSchema.parse(await request.json()));
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
