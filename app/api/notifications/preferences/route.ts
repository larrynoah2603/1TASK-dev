import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  listNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/knowledge-service";
import { requirePermission } from "@/lib/server-auth";
import { notificationPreferenceSchema } from "@/lib/validation";


export async function GET() {

  try {

    const actor = await requirePermission("notification:preferences");


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

    const actor = await requirePermission("notification:preferences");


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
