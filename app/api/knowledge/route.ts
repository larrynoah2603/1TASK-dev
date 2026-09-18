import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { addWorklog } from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { productionSearchQuerySchema, worklogSchema } from "@/lib/validation";
import { listKnowledgeArticlesPage } from "@/lib/knowledge-service";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("knowledge:read");
    const searchParams = new URL(request.url).searchParams;
    const filters = productionSearchQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    const page = await listKnowledgeArticlesPage(actor, filters.q, filters);
    return NextResponse.json({
      articles: page.items,
      pagination: { pageSize: page.pageSize, hasMore: page.hasMore, nextCursor: page.nextCursor },
    });
  } catch (error) {
    return errorResponse(error);
  }
}


export async function POST(
  request: Request,
) {

  try {

    const actor = await requirePermission("worklog:create");


    const worklog =
      await addWorklog(
        actor,
        worklogSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      worklog,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}
