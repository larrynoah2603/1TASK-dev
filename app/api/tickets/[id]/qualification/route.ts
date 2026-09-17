import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import { qualifyTicket } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { ticketQualificationSchema } from "@/lib/validation";


function isValidTicketId(id: string) {
  return Boolean(
    id &&
    id.trim().length > 0,
  );
}



export async function PATCH(
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



    const payload =
      ticketQualificationSchema.parse(
        await request.json(),
      );



    const ticket =
      await qualifyTicket(
        actor,
        id,
        payload,
      );


    return NextResponse.json(ticket);


  } catch (error) {

    return errorResponse(error);

  }
}