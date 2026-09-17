import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { createAsset, listAssetsForViewer } from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { assetSchema, productionSearchQuerySchema } from "@/lib/validation";


export async function GET(
  request: Request,
) {
  try {

    const actor = await requirePermission("asset:read");


    const { q: query } = productionSearchQuerySchema.parse({
      q: new URL(request.url).searchParams.get("q") ?? undefined,
    });


    return NextResponse.json({
      assets:
        await listAssetsForViewer(
          actor,
          query,
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
