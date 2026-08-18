import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { completeMission } from "@/lib/production-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    return NextResponse.json(await completeMission(actor, id));
  } catch (error) {
    return errorResponse(error);
  }
}
