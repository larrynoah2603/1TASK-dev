import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  countUnreadNotifications,
  listUserNotifications,
} from "@/lib/notification-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { notificationListQuerySchema } from "@/lib/validation";


export const dynamic = "force-dynamic";


export async function GET(
  request: Request,
) {

  try {

    const actor =
      await requireSessionUserContext();


    const take = notificationListQuerySchema.parse({
      take: new URL(request.url).searchParams.get("take") ?? undefined,
    }).take;



    const [
      notifications,
      unreadCount,
    ] = await Promise.all([

      listUserNotifications(
        actor,
        take,
      ),

      countUnreadNotifications(
        actor,
      ),

    ]);



    return NextResponse.json({

      unreadCount,

      notifications:
        notifications.map(
          (item) => ({

            id:
              item.id,

            title:
              item.title,

            body:
              item.body,

            status:
              item.status,

            ticketId:
              item.ticketId,

            ticketReference:
              item.ticket?.reference
              ?? null,

            createdAt:
              item.createdAt
                .toISOString(),

          }),
        ),

    });


  } catch (error) {

    return errorResponse(error);

  }
}
