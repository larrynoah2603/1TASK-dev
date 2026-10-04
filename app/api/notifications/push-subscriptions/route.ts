import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readServerEnvironment } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { requireProductCapability } from "@/lib/product-policy.server";
import { requireSessionUserContext } from "@/lib/server-auth";

const schema = z.object({ endpoint: z.url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) }).strict();

export async function GET() {
  try {
    requireProductCapability("pushNotifications");
    await requireSessionUserContext();
    return NextResponse.json({ publicKey: readServerEnvironment().WEB_PUSH_PUBLIC_KEY ?? null });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    requireProductCapability("pushNotifications");
    const actor = await requireSessionUserContext();
    const input = schema.parse(await request.json());
    const subscription = await prisma.pushSubscription.upsert({ where: { endpoint: input.endpoint }, update: { userId: actor.id, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: request.headers.get("user-agent") }, create: { userId: actor.id, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: request.headers.get("user-agent") } });
    return NextResponse.json(subscription, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    requireProductCapability("pushNotifications");
    const actor = await requireSessionUserContext();
    const { endpoint } = z.object({ endpoint: z.url() }).parse(await request.json());
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: actor.id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
