import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listVisibleTickets } from "@/lib/ticket-query-service";
import { requireSessionUserContext } from "@/lib/server-auth";


export const dynamic = "force-dynamic";


const MAX_QUERY_LENGTH = 120;



export async function GET(
  request: Request,
) {

  try {

    const query =
      new URL(request.url)
        .searchParams
        .get("q")
        ?.trim()
        ?? "";



    if (
      query.length < 2 ||
      query.length > MAX_QUERY_LENGTH
    ) {

      return NextResponse.json({
        tickets: [],
      });

    }



    const actor =
      await requireSessionUserContext();



    const tickets =
      await listVisibleTickets(
        actor,
        {
          query,
          take: 8,
          sort: "updated_desc",
        },
      );



    return NextResponse.json({

      tickets:
        tickets.map(
          (ticket) => ({

            id:
              ticket.id,

            reference:
              ticket.reference,

            title:
              ticket.title,

            status:
              ticket.status,

            queue:
              ticket.queue.name,

            updatedAt:
              ticket.updatedAt
                .toISOString(),

          }),
        ),

    });


  } catch (error) {

    return errorResponse(error);

  }
}