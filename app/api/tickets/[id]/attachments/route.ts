import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listTicketAttachmentsForViewer, uploadTicketAttachment } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Un fichier est obligatoire." }, { status: 422 });
    }
    const attachment = await uploadTicketAttachment(actor, id, file);
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    return NextResponse.json(await listTicketAttachmentsForViewer(actor, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
