import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { transferTicket } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { queueTransferSchema } from "@/lib/validation";


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



    let body: unknown;


    try {

      body =
        await request.json();

    } catch {

      return NextResponse.json(
        {
          error:
            "Données JSON invalides.",
        },
        {
          status: 422,
        },
      );

    }



    const ticket =
      await transferTicket(
        actor,
        id,
        queueTransferSchema.parse(body),
      );


    return NextResponse.json(ticket);


  } catch (error) {

    return errorResponse(error);

  }
}