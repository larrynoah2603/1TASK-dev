import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listMissionWorklogsPage } from "@/lib/production-service";
import { AuthorizationError, requireSessionUserContext } from "@/lib/server-auth";


function requirePermission(
  actor: Awaited<ReturnType<typeof requireSessionUserContext>>,
  permission: string,
) {

  const permissions =
    actor.roleAssignments.flatMap(
      (assignment) =>
        assignment.role.permissions.map(
          (item) => item.permission.code,
        ),
    );


  if (!permissions.includes(permission)) {
    throw new AuthorizationError("Permission insuffisante.");
  }
}



export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "portfolio:read",
    );


    const { id } =
      await context.params;


    const searchParams = new URL(request.url).searchParams;
    const limit = searchParams.get("limit");
    const page = await listMissionWorklogsPage(actor, id, {
      cursor: searchParams.get("cursor") || undefined,
      pageSize: limit === null ? undefined : Number(limit),
    });
    const response = NextResponse.json({ worklogs: page.worklogs });
    response.headers.set("X-Has-More", String(page.hasMore));
    if (page.nextCursor) response.headers.set("X-Next-Cursor", page.nextCursor);
    return response;


  } catch (error) {

    return errorResponse(error);

  }
}
