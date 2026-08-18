import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-auth";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("ticket:create");
    const services = await prisma.serviceCatalogItem.findMany({
      where: { isActive: true, queue: { isActive: true, department: { isActive: true } } },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        ticketType: true,
        category: true,
        priorityDefault: true,
        sla: {
          select: {
            id: true,
            code: true,
            name: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
            isActive: true,
            calendar: { select: { isActive: true } },
          },
        },
        escalationRules: {
          where: { isActive: true },
          select: { id: true, thresholdPercent: true, targetRole: true },
        },
        queue: {
          select: {
            id: true,
            code: true,
            name: true,
            department: { select: { id: true, code: true, name: true } },
            escalationRules: {
              where: { isActive: true },
              select: { id: true, thresholdPercent: true, targetRole: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(
      services
        .filter((service) => service.sla?.isActive && service.sla.calendar.isActive)
        .map((service) => ({
          ...service,
          escalationRules: [
            ...service.queue.escalationRules,
            ...service.escalationRules,
          ],
        })),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
