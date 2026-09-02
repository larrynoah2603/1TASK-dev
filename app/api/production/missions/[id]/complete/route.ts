import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createMission,
  listMissionsForViewer,
} from "@/lib/production-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { missionSchema } from "@/lib/validation";


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


    const searchParams =
      new URL(request.url)
        .searchParams;


    return NextResponse.json({
      missions:
        await listMissionsForViewer(
          actor,
          {
            query:
              searchParams.get("q")
              ?? undefined,

            status:
              searchParams.get("status")
              ?? undefined,

            departmentId:
              searchParams.get("departmentId")
              ?? undefined,

            dossierId:
              searchParams.get("dossierId")
              ?? undefined,
          },
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


    const mission =
      await createMission(
        actor,
        missionSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      mission,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}