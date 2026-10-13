import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import {
  getTicketAttachmentForViewer,
} from "@/lib/ticket-attachment-service";
import {
  requireSessionUserContext,
} from "@/lib/server-auth";


export const dynamic = "force-dynamic";


function isValidId(value: string) {
  return Boolean(
    value &&
    value.trim().length > 0,
  );
}



export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
      attachmentId: string;
    }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    const {
      id,
      attachmentId,
    } =
      await context.params;



    if (
      !isValidId(id) ||
      !isValidId(attachmentId)
    ) {

      return apiErrorResponse({ message: "Identifiant invalide.", code: "INVALID_IDENTIFIER", status: 400 });

    }



    const attachment =
      await getTicketAttachmentForViewer(
        actor,
        id,
        attachmentId,
      );



    const safeName =
      attachment.fileName.replace(
        /[\r\n"\\]/g,
        "_",
      );



    return new NextResponse(
      new Uint8Array(
        attachment.content,
      ),
      {
        headers: {
          "Content-Type":
            attachment.mimeType,

          "Content-Length":
            String(
              attachment.sizeBytes,
            ),

          "Content-Disposition":
            `attachment; filename="${safeName}"`,

          "Cache-Control":
            "private, no-store",

          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox",
        },
      },
    );


  } catch(error) {

    return errorResponse(error);

  }
}
