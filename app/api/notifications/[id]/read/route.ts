import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  markNotificationAsRead,
} from "@/lib/notification-service";
import {
  requireSessionUserContext,
} from "@/lib/server-auth";


export async function PATCH(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    const { id } =
      await context.params;


    const notification =
      await markNotificationAsRead(
        actor,
        id,
      );


    return NextResponse.json({
      notification,
    });


  } catch (error) {

    return errorResponse(error);

  }

}