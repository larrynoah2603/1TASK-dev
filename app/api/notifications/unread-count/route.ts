import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { countUnreadNotifications } from "@/lib/notification-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireSessionUserContext();
    const unreadCount = await countUnreadNotifications(actor);
    return NextResponse.json({ unreadCount });
  } catch (error) {
    return errorResponse(error);
  }
}
