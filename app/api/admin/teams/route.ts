import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveTeam } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";


export async function POST(
  request: Request,
) {
  try {
    const actor = await requireAdminAccess(
      "SECURITY",
    );


    const payload = await request.json();


    const team = await saveTeam(
      actor,
      undefined,
      payload,
    );


    return NextResponse.json(
      team,
      {
        status: 201,
      },
    );


  } catch (error) {
    return errorResponse(error);
  }
}