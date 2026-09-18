import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";
import { cursorPageQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  try {
    const actor = await requireAdminAccess(
      "FUNCTIONAL",
    );

    const searchParams = new URL(request.url).searchParams;
    const page = cursorPageQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    const configuration = await getAdminConfiguration(actor, ["users"], { users: page });


    return NextResponse.json(
      {
        users: configuration.users,
        pagination: {
          pageSize: configuration.pagination.users.pageSize,
          hasMore: configuration.pagination.users.hasMore,
          nextCursor: configuration.pagination.users.nextCursor,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

  } catch (error) {
    return errorResponse(error);
  }
}
