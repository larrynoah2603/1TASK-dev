import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { exportReportingSummary } from "@/lib/export-service";
import { requireSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireSessionUserContext();
    const csv = await exportReportingSummary(actor);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reporting-ticketing.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
