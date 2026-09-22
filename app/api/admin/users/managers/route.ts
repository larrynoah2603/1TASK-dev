import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { searchAdminManagerOptions } from "@/lib/admin-user-query-service";
import { requireAdminAccess } from "@/lib/server-auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const params = new URL(request.url).searchParams;
    const departmentId = params.get("departmentId")?.trim() ?? "";
    if (!departmentId) return NextResponse.json({ managers: [] }, { headers: { "Cache-Control": "no-store" } });
    const managers = await searchAdminManagerOptions(actor, { departmentId, q: params.get("q") ?? undefined, excludeId: params.get("excludeId") ?? undefined, take: 20 });
    return NextResponse.json({ managers: managers.map((item) => ({ id: item.id, name: item.managedDisplayName ?? item.entraDisplayName ?? item.name, email: item.email })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
