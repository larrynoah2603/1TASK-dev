import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { moveAsset } from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { assetMovementSchema } from "@/lib/validation";


export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor = await requirePermission("asset:manage");


    const { id } =
      await context.params;


    const movement =
      await moveAsset(
        actor,
        id,
        assetMovementSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      movement,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}