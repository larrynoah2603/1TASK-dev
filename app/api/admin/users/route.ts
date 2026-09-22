import { NextResponse } from "next/server";
import { UserStatus } from "@prisma/client";
import { errorResponse } from "@/lib/http";
import { listAdminUsersPage } from "@/lib/admin-user-query-service";
import { requireAdminAccess } from "@/lib/server-auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const params = new URL(request.url).searchParams;
    const statusRaw = params.get("status");
    const status = statusRaw && Object.values(UserStatus).includes(statusRaw as UserStatus) ? statusRaw as UserStatus : undefined;
    const result = await listAdminUsersPage(actor, {
      q: params.get("q") ?? undefined,
      status,
      page: Number(params.get("page") ?? "1") || 1,
      pageSize: Number(params.get("pageSize") ?? "50") || 50,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
