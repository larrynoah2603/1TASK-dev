import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createMission,
  listMissionsForViewer,
} from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { missionListQuerySchema, missionSchema } from "@/lib/validation";


export async function GET(
  request: Request,
) {

  try {

    const actor = await requirePermission("portfolio:read");


    const searchParams =
      new URL(request.url)
        .searchParams;

    const filters = missionListQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      dossierId: searchParams.get("dossierId") ?? undefined,
      take: searchParams.get("take") ?? undefined,
    });


    return NextResponse.json({
      missions:
        await listMissionsForViewer(
          actor,
          {
            query: filters.q,
            status: filters.status,
            departmentId: filters.departmentId,
            dossierId: filters.dossierId,
            take: filters.take,
          },
        ),
    });


  } catch (error) {

    return errorResponse(error);

  }
}



export async function POST(
  request: Request,
) {

  try {

    const actor = await requirePermission("portfolio:manage");


    const mission =
      await createMission(
        actor,
        missionSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      mission,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}
