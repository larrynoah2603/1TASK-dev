import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createClientAccount,
  listClientAccountsPage,
} from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { clientAccountSchema, productionSearchQuerySchema } from "@/lib/validation";


export async function GET(
  request: Request,
) {

  try {

    const actor = await requirePermission("portfolio:read");


    const searchParams = new URL(request.url).searchParams;
    const filters = productionSearchQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const page = await listClientAccountsPage(actor, filters.q, filters);


    return NextResponse.json({
      clients:
        page.items,
      pagination: {
        pageSize: page.pageSize,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
      },
    });


  } catch (error) {

    return errorResponse(error);

  }
}



export async function POST(
  request: Request,
) {

  try {

    const actor = await requirePermission("portfolio:manage");


    const client =
      await createClientAccount(
        actor,
        clientAccountSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      client,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}
