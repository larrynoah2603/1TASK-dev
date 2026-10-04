import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listMissionWorklogsPage } from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { requireProductCapability } from "@/lib/product-policy.server";


export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor = await requirePermission("portfolio:read");
    requireProductCapability("productionPortfolio");


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
