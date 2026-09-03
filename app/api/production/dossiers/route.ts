import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createDossier,
  listDossiersForViewer,
} from "@/lib/production-service";
import { AuthorizationError, requireSessionUserContext } from "@/lib/server-auth";
import { dossierSchema, productionSearchQuerySchema } from "@/lib/validation";


function requirePermission(
  actor: Awaited<ReturnType<typeof requireSessionUserContext>>,
  permission: string,
) {

  const permissions =
    actor.roleAssignments.flatMap(
      (assignment) =>
        assignment.role.permissions.map(
          (item) => item.permission.code,
        ),
    );


  if (!permissions.includes(permission)) {
    throw new AuthorizationError("Permission insuffisante.");
  }
}



export async function GET(
  request: Request,
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "portfolio:read",
    );


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

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "portfolio:manage",
    );


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
