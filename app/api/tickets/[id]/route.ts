import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getTicketForViewer } from "@/lib/ticket-detail-service";
import { requireSessionUserContext } from "@/lib/server-auth";


export const dynamic = "force-dynamic";


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



    const ticket =
      await getTicketForViewer(
        actor,
        id,
      );



    return NextResponse.json(ticket);


  } catch (error) {

    return errorResponse(error);

  }
}