import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  listNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/knowledge-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { notificationPreferenceSchema } from "@/lib/validation";


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



export async function GET() {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "notification:preferences",
    );


    return NextResponse.json({
      preferences:
        await listNotificationPreferences(
          actor,
        ),
    });


  } catch (error) {

    return errorResponse(error);

  }
}



export async function PUT(
  request: Request,
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "notification:preferences",
    );


    const preference =
      await updateNotificationPreference(
        actor,
        notificationPreferenceSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      preference,
    );


  } catch (error) {

    return errorResponse(error);

  }
}
