import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  listNotificationRules,
  notificationRuleOptions,
  saveNotificationRule,
} from "@/lib/admin-notification-service";
import { requireAdminAccess } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json({
      rules: await listNotificationRules(actor),
      options: notificationRuleOptions,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json(
      await saveNotificationRule(actor, undefined, await request.json()),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
