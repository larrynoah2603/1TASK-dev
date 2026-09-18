import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import {
  listTicketAttachmentsForViewer,
  uploadTicketAttachment,
} from "@/lib/ticket-attachment-service";
import { requireSessionUserContext } from "@/lib/server-auth";


export const dynamic = "force-dynamic";


function isValidTicketId(id: string) {
  return Boolean(
    id &&
    id.trim().length > 0,
  );
}



export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    const { id } =
      await context.params;


    if (!isValidTicketId(id)) {

      return apiErrorResponse({ message: "Identifiant ticket invalide.", code: "INVALID_IDENTIFIER", status: 400 });

    }



    const form =
      await request.formData();


    const file =
      form.get("file");



    if (!(file instanceof File)) {

      return apiErrorResponse({ message: "Un fichier est obligatoire.", code: "VALIDATION_ERROR", status: 422 });

    }



    const attachment =
      await uploadTicketAttachment(
        actor,
        id,
        file,
      );


    return NextResponse.json(
      attachment,
      {
        status:201,
      },
    );


  } catch(error) {

    return errorResponse(error);

  }
}



export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    const { id } =
      await context.params;


    if (!isValidTicketId(id)) {

      return apiErrorResponse({ message: "Identifiant ticket invalide.", code: "INVALID_IDENTIFIER", status: 400 });

    }



    return NextResponse.json(
      await listTicketAttachmentsForViewer(
        actor,
        id,
      ),
      {
        headers:{
          "Cache-Control":
            "no-store",
        },
      },
    );


  } catch(error) {

    return errorResponse(error);

  }
}
