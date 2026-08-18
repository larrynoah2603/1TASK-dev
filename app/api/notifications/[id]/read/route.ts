import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { requireSessionUserContext } from "@/lib/server-auth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const notification = await prisma.notification.updateMany({
      where: { id, recipientId: actor.id },
      data: { status: "READ", readAt: new Date() },
    });
    if (!notification.count) return NextResponse.json({ error: "Notification introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
