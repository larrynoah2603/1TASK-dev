import { NextResponse } from "next/server";
import { saveV1TriageConfiguration } from "@/lib/admin-service";
import { errorResponse } from "@/lib/http";
import { requireAdminAccess } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    return NextResponse.json(await saveV1TriageConfiguration(actor, await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}
