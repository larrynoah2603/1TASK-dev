import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  countUnreadNotifications,
  listUserNotifications,
} from "@/lib/notification-service";
import { requireSessionUserContext } from "@/lib/server-auth";


export const dynamic = "force-dynamic";


const MAX_NOTIFICATIONS = 100;



export async function GET(
  request: Request,
) {

  try {

    const actor =
      await requireSessionUserContext();


    const rawTake =
      Number(
        new URL(request.url)
          .searchParams
          .get("take") ?? 50,
      );


    const take =
      Number.isFinite(rawTake)
        ? Math.min(
            Math.max(rawTake, 1),
            MAX_NOTIFICATIONS,
          )
        : 50;



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