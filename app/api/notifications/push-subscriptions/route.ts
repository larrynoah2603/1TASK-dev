import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOriginMutation, pushSubscriptionSchema, readBoundedJson } from "@/lib/push-subscription-security";
import { prisma } from "@/lib/db";
import { readServerEnvironment } from "@/lib/env";
import { errorResponse, httpErrorResponse } from "@/lib/http";
import { requireProductCapability } from "@/lib/product-policy.server";
import { requireSessionUserContext } from "@/lib/server-auth";

// The exact account-bound schema lives in push-subscription-security.ts.

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
    if (!isSameOriginMutation(request)) return httpErrorResponse("Origine refusée.", 403);
    const input = pushSubscriptionSchema.parse(await readBoundedJson(request));
    const subscription = await prisma.pushSubscription.upsert({ where: { endpoint: input.endpoint }, update: { userId: actor.id, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: request.headers.get("user-agent") }, create: { userId: actor.id, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: request.headers.get("user-agent") } });
    // Never echo P-256 key material, auth secrets or endpoint URLs to the UI.
    return NextResponse.json({ ok: true, id: subscription.id }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    requireProductCapability("pushNotifications");
    const actor = await requireSessionUserContext();
    if (!isSameOriginMutation(request)) return httpErrorResponse("Origine refusée.", 403);
    const { endpoint } = z.object({ endpoint: z.url().max(2048) }).strict().parse(await readBoundedJson(request));
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: actor.id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
