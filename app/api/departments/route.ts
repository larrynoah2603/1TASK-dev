import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermissionForTicketCreationDepartments } from "@/lib/server-auth";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const departmentWhere = await requirePermissionForTicketCreationDepartments();
    const departments = await prisma.department.findMany({
      where: departmentWhere,
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(departments);
  } catch (error) {
    return errorResponse(error);
  }
}
