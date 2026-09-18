import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { createAsset, listAssetsForViewerPage } from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { assetSchema, productionSearchQuerySchema } from "@/lib/validation";


export async function GET(
  request: Request,
) {
  try {

    const actor = await requirePermission("asset:read");


    const searchParams = new URL(request.url).searchParams;
    const filters = productionSearchQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const page = await listAssetsForViewerPage(actor, filters.q, filters);


    return NextResponse.json({
      assets:
        page.items,
      pagination: {
        pageSize: page.pageSize,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
      },
    });


  } catch (error) {

    return errorResponse(error);

  }
}



export async function POST(
  request: Request,
) {
  try {

    const actor = await requirePermission("asset:manage");


    const asset =
      await createAsset(
        actor,
        assetSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      asset,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}
