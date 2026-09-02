import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveQueue } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";


export async function POST(
  request: Request,
) {
  try {
    const actor = await requireAdminAccess(
      "FUNCTIONAL",
    );


    const payload = await request.json();


    const queue = await saveQueue(
      actor,
      undefined,
      payload,
    );


    return NextResponse.json(
      queue,
      {
        status: 201,
      },
    );


  } catch (error) {
    return errorResponse(error);
  }
}
