import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUserContext } from "@/lib/server-auth";
import { errorResponse } from "@/lib/http";
import { readServerEnvironment } from "@/lib/env";
import { V1_CONFIGURATION_ID } from "@/lib/triage-configuration";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSessionUserContext();
    const now = new Date();
    const v1Profile = readServerEnvironment().PRODUCT_PROFILE === "v1";
    const globalTriageServiceId = v1Profile
      ? (await prisma.v1Configuration.findUnique({
          where: { id: V1_CONFIGURATION_ID },
          select: { globalTriageServiceId: true },
        }))?.globalTriageServiceId ?? null
      : null;
    const services = await prisma.serviceCatalogItem.findMany({
      where: { isActive: true, provisionedTriageDepartmentId: null, queue: { isActive: true, department: { isActive: true } } },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        ticketType: true,
        category: true,
        priorityDefault: true,
        allowConfidentialTickets: true,
        confidentialityVersion: true,
        confidentialPrimaryRecipient: { select: { id: true, name: true, status: true, administrativelyDisabled: true } },
        confidentialDelegations: {
          where: { startsAt: { lte: now }, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          orderBy: { startsAt: "desc" }, take: 1,
          select: { id: true, substitute: { select: { id: true, name: true, status: true, administrativelyDisabled: true } } },
        },
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
        .filter((service) => service.sla?.isActive && service.sla.calendar.isActive && service.id !== globalTriageServiceId)
        .map((service) => {
          const activeDelegation = service.confidentialDelegations[0];
          const effective = activeDelegation?.substitute ?? service.confidentialPrimaryRecipient;
          const recipient = effective?.status === "ACTIVE" && !effective.administrativelyDisabled ? { id: effective.id, name: effective.name } : null;
          return ({
          ...service, confidentialPrimaryRecipient: undefined, confidentialDelegations: undefined,
          confidentialRecipient: recipient,
          confidentialReplacementActive: Boolean(activeDelegation && recipient),
          escalationRules: [
            ...service.queue.escalationRules,
            ...service.escalationRules,
          ],
        }); }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
