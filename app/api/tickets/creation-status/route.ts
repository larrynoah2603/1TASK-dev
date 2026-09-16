import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requirePermission } from "@/lib/server-auth";
import { findCreatedTicketByToken } from "@/lib/ticket-service";
import { creationIdempotencyTokenSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("ticket:create");
    const token = creationIdempotencyTokenSchema.parse(
      new URL(request.url).searchParams.get("token"),
    );
    const ticket = await findCreatedTicketByToken(actor, token);

    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
