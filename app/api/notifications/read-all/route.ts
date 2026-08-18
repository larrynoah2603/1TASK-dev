import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { requireSessionUserContext } from "@/lib/server-auth";

export async function POST() {
  try {
    const actor = await requireSessionUserContext();
    await prisma.notification.updateMany({ where: { recipientId: actor.id, readAt: null }, data: { status: "READ", readAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
