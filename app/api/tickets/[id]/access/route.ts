import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { grantConfidentialAccess } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { confidentialAccessSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const result = await grantConfidentialAccess(actor, id, confidentialAccessSchema.parse(await request.json()));
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
