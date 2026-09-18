import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  countUnreadNotifications,
  listUserNotificationsPage,
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


    const filters = notificationListQuerySchema.parse({
      take: new URL(request.url).searchParams.get("take") ?? undefined,
      cursor: new URL(request.url).searchParams.get("cursor") ?? undefined,
    });



    const [
      notificationPage,
      unreadCount,
    ] = await Promise.all([

      listUserNotificationsPage(actor, { pageSize: filters.take, cursor: filters.cursor }),

      countUnreadNotifications(
        actor,
      ),

    ]);



    return NextResponse.json({

      unreadCount,

      notifications:
        notificationPage.items.map(
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

      pagination: {
        pageSize: notificationPage.pageSize,
        hasMore: notificationPage.hasMore,
        nextCursor: notificationPage.nextCursor,
      },
    });


  } catch (error) {

    return errorResponse(error);

  }
}
