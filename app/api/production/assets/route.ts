import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { createAsset, listAssetsForViewer } from "@/lib/production-service";
import { AuthorizationError, requireSessionUserContext } from "@/lib/server-auth";
import { assetSchema, productionSearchQuerySchema } from "@/lib/validation";


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
      "asset:read",
    );


    const { q: query } = productionSearchQuerySchema.parse({
      q: new URL(request.url).searchParams.get("q") ?? undefined,
    });


    return NextResponse.json({
      assets:
        await listAssetsForViewer(
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
      "asset:manage",
    );


    const asset =
      await createAsset(
        actor,
        assetSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      asset,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}
