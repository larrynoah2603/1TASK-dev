import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getTicketAttachmentForViewer } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id, attachmentId } = await context.params;
    const attachment = await getTicketAttachmentForViewer(actor, id, attachmentId);
    const safeName = attachment.fileName.replace(/[\r\n"\\]/g, "_");
    return new NextResponse(new Uint8Array(attachment.content), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
