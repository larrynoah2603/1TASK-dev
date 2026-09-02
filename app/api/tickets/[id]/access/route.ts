import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { grantConfidentialAccess } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { confidentialAccessSchema } from "@/lib/validation";


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
          status:400,
        },
      );

    }



    const payload =
      confidentialAccessSchema.parse(
        await request.json(),
      );



    const result =
      await grantConfidentialAccess(
        actor,
        id,
        payload,
      );


    return NextResponse.json(result);


  } catch(error) {

    return errorResponse(error);

  }
}