import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { addWorklog } from "@/lib/production-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { worklogSchema } from "@/lib/validation";


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
    throw new Error(
      "Permission insuffisante.",
    );
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
      "worklog:create",
    );


    const worklog =
      await addWorklog(
        actor,
        worklogSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      worklog,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}