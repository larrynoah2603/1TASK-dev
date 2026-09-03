import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  markAllNotificationsAsRead,
} from "@/lib/notification-service";
import {
  requireSessionUserContext,
} from "@/lib/server-auth";


export async function POST() {

  try {

    const actor =
      await requireSessionUserContext();


    const result =
      await markAllNotificationsAsRead(
        actor,
      );


    return NextResponse.json({

      ok: true,

      updated:
        result.count,

    });


  } catch (error) {

    return errorResponse(error);

  }

}