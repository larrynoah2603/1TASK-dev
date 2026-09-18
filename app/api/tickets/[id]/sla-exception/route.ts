import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import { addSlaException } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { slaExceptionSchema } from "@/lib/validation";


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



    let body: unknown;


    try {

      body =
        await request.json();

    } catch {

      return apiErrorResponse({ message: "Données JSON invalides.", code: "INVALID_JSON", status: 422 });

    }



    const exception =
      await addSlaException(
        actor,
        id,
        slaExceptionSchema.parse(body),
      );


    return NextResponse.json(
      exception,
      {
        status:201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}