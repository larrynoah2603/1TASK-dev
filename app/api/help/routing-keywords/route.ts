import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readServerEnvironment } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { requireSessionUserContext } from "@/lib/server-auth";
import { V1_CONFIGURATION_ID } from "@/lib/triage-configuration";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSessionUserContext();

    const v1Profile = readServerEnvironment().PRODUCT_PROFILE === "v1";
    const globalTriageServiceId = v1Profile
      ? (await prisma.v1Configuration.findUnique({
          where: { id: V1_CONFIGURATION_ID },
          select: { globalTriageServiceId: true },
        }))?.globalTriageServiceId ?? null
      : null;

    const services = await prisma.serviceCatalogItem.findMany({
      where: {
        isActive: true,
        provisionedTriageDepartmentId: null,
        queue: {
          isActive: true,
          department: { isActive: true },
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        keywords: true,
        sla: {
          select: {
            isActive: true,
            calendar: { select: { isActive: true } },
          },
        },
        queue: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const entries = services
      .filter((service) =>
        service.id !== globalTriageServiceId &&
        !service.code.toUpperCase().startsWith("TRIAGE-") &&
        service.sla?.isActive &&
        service.sla.calendar.isActive &&
        service.keywords.length > 0
      )
      .map((service) => ({
        department: service.queue.department,
        queue: { id: service.queue.id, name: service.queue.name },
        service: {
          id: service.id,
          name: service.name,
          description: service.description,
        },
        keywords: [...new Set(service.keywords.map((keyword) => keyword.trim()).filter(Boolean))],
      }))
      .filter((entry) => entry.keywords.length > 0)
      .sort((left, right) =>
        left.department.name.localeCompare(right.department.name, "fr") ||
        left.queue.name.localeCompare(right.queue.name, "fr") ||
        left.service.name.localeCompare(right.service.name, "fr")
      );

    return NextResponse.json(entries, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
