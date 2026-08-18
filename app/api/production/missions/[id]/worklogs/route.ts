import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listMissionWorklogs } from "@/lib/production-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    return NextResponse.json({ worklogs: await listMissionWorklogs(actor, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
