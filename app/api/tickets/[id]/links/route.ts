import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import {
  createTicketLink,
  listTicketLinksForViewer,
} from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { ticketLinkSchema } from "@/lib/validation";


function isValidTicketId(id: string) {
  return Boolean(
    id &&
    id.trim().length > 0,
  );
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



    return NextResponse.json({
      links:
        await listTicketLinksForViewer(
          actor,
          id,
        ),
    });


  } catch(error) {

    return errorResponse(error);

  }
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



    const link =
      await createTicketLink(
        actor,
        id,
        ticketLinkSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      link,
      {
        status:201,
      },
    );


  } catch(error) {

    return errorResponse(error);

  }
}