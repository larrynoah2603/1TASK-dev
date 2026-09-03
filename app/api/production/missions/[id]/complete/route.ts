import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { completeMission } from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";

const missionIdSchema = z.string().cuid();

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission("portfolio:manage");
    const { id } = await context.params;
    const mission = await completeMission(actor, missionIdSchema.parse(id));
    return NextResponse.json(mission);
  } catch (error) {
    return errorResponse(error);
  }
}
