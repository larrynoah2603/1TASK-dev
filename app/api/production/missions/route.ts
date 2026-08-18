import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { createMission, listMissionsForViewer } from "@/lib/production-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { missionSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const searchParams = new URL(request.url).searchParams;
    return NextResponse.json({ missions: await listMissionsForViewer(actor, {
      query: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      dossierId: searchParams.get("dossierId") ?? undefined,
    }) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const mission = await createMission(actor, missionSchema.parse(await request.json()));
    return NextResponse.json(mission, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
