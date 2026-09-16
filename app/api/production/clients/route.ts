import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createClientAccount,
  listClientAccounts,
} from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { clientAccountSchema, productionSearchQuerySchema } from "@/lib/validation";


export async function GET(
  request: Request,
) {

  try {

    const actor = await requirePermission("portfolio:read");


    const { q: query } = productionSearchQuerySchema.parse({
      q: new URL(request.url).searchParams.get("q") ?? undefined,
    });


    return NextResponse.json({
      clients:
        await listClientAccounts(
          actor,
          query,
        ),
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
