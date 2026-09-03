import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { moveAsset } from "@/lib/production-service";
import { AuthorizationError, requireSessionUserContext } from "@/lib/server-auth";
import { assetMovementSchema } from "@/lib/validation";


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



export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "asset:manage",
    );


    const { id } =
      await context.params;


    const movement =
      await moveAsset(
        actor,
        id,
        assetMovementSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      movement,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}