import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createDossier,
  listDossiersForViewer,
} from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { dossierSchema, productionSearchQuerySchema } from "@/lib/validation";


export async function GET(
  request: Request,
) {

  try {

    const actor = await requirePermission("portfolio:read");


    const { q: query } = productionSearchQuerySchema.parse({
      q: new URL(request.url).searchParams.get("q") ?? undefined,
    });


    return NextResponse.json({
      dossiers:
        await listDossiersForViewer(
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
