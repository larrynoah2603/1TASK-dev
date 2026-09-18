import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import { claimTicket } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { claimTicketSchema } from "@/lib/validation";


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



    const rawBody =
      await request.text();


    let body: unknown = {};



    if (rawBody.trim()) {

      try {

        body =
          JSON.parse(rawBody);

      } catch {

        return apiErrorResponse({ message: "Données invalides.", code: "VALIDATION_ERROR", status: 422 });

      }

    }



    const ticket =
      await claimTicket(
        actor,
        id,
        claimTicketSchema.parse(body),
      );


    return NextResponse.json(ticket);


  } catch (error) {

    return errorResponse(error);

  }
}