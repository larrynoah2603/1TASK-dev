import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
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

      return NextResponse.json(
        {
          error:
            "Identifiant ticket invalide.",
        },
        {
          status: 400,
        },
      );

    }



    const rawBody =
      await request.text();


    let body: unknown = {};



    if (rawBody.trim()) {

      try {

        body =
          JSON.parse(rawBody);

      } catch {

        return NextResponse.json(
          {
            error:
              "Données invalides.",
          },
          {
            status: 422,
          },
        );

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