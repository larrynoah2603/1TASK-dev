import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listMissionWorklogs } from "@/lib/production-service";
import { AuthorizationError, requireSessionUserContext } from "@/lib/server-auth";


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
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "portfolio:read",
    );


    const { id } =
      await context.params;


    return NextResponse.json({
      worklogs:
        await listMissionWorklogs(
          actor,
          id,
        ),
    });


  } catch (error) {

    return errorResponse(error);

  }
}