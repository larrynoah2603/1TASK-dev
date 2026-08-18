import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireAdminAccess } from "@/lib/server-auth";
import {
  listEntraDepartmentMappings,
  listPendingEntraUsers,
  upsertEntraDepartmentMapping,
} from "@/lib/organization-service";
import { entraDepartmentMappingSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const [pendingUsers, mappings] = await Promise.all([
      listPendingEntraUsers(actor),
      listEntraDepartmentMappings(actor),
    ]);
    return NextResponse.json({ pendingUsers, mappings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminAccess("FUNCTIONAL");
    const input = entraDepartmentMappingSchema.parse(await request.json());
    const result = await upsertEntraDepartmentMapping(actor, input);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
