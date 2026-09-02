import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listAuditLogsForViewer } from "@/lib/audit-service";
import { requireSessionUserContext } from "@/lib/server-auth";


export const dynamic = "force-dynamic";


function requirePermission(
  actor: Awaited<ReturnType<typeof requireSessionUserContext>>,
  permission: string,
) {

  const permissions =
    actor.roleAssignments.flatMap(
      (assignment) =>
        assignment.role.permissions.map(
          (item) => item.permission.code,
        ),
    );


  if (!permissions.includes(permission)) {
    throw new Error(
      "Permission insuffisante.",
    );
  }
}



export async function GET() {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "audit:read",
    );


    return NextResponse.json(
      await listAuditLogsForViewer(
        actor,
      ),
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}