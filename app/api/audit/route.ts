import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listAuditLogsForViewer } from "@/lib/audit-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireSessionUserContext();
    return NextResponse.json(await listAuditLogsForViewer(actor), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
