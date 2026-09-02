import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { saveSla } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";


export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const actor = await requireAdminAccess(
      "SECURITY",
    );


    const { id } = await context.params;


    const payload =
      await request.json();


    const sla = await saveSla(
      actor,
      id,
      payload,
    );


    return NextResponse.json(sla);


  } catch (error) {
    return errorResponse(error);
  }
}