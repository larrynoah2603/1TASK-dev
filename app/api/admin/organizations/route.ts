import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveOrganization } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";


export async function POST(
  request: Request,
) {
  try {
    const actor = await requireAdminAccess(
      "SECURITY",
    );


    const payload = await request.json();


    const organization =
      await saveOrganization(
        actor,
        undefined,
        payload,
      );


    return NextResponse.json(
      organization,
      {
        status: 201,
      },
    );


  } catch (error) {
    return errorResponse(error);
  }
}