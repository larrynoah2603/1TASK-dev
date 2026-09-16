import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/server-auth";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requirePermission("ticket:create");
    const canCreateCrossDepartment = hasPermission(actor, "ticket:create:cross-department");
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
        ...(canCreateCrossDepartment ? {} : { id: actor.departmentId ?? "__none__" }),
      },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(departments);
  } catch (error) {
    return errorResponse(error);
  }
}
