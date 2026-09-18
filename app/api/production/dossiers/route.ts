import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createDossier,
  listDossiersForViewerPage,
} from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { dossierSchema, productionSearchQuerySchema } from "@/lib/validation";


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

    const page = await listDossiersForViewerPage(actor, filters.q, filters);


    return NextResponse.json({
      dossiers:
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


    const dossier =
      await createDossier(
        actor,
        dossierSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      dossier,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}
