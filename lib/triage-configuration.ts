import { Priority, TicketType, type Prisma } from "@prisma/client";

export const V1_CONFIGURATION_ID = "default";

export class TriageConfigurationError extends Error {
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = "TriageConfigurationError";
  }
}

export function triageResourceCodes(departmentId: string) {
  return {
    queueCode: `V1-TRIAGE-Q-${departmentId}`,
    serviceCode: `V1-TRIAGE-S-${departmentId}`,
  };
}

export async function provisionDepartmentTriage(
  tx: Prisma.TransactionClient,
  department: { id: string; code: string; name: string; isActive: boolean },
) {
  const configuration = await tx.v1Configuration.findUnique({
    where: { id: V1_CONFIGURATION_ID },
    include: { defaultTriageSla: { include: { calendar: true } } },
  });
  if (!configuration?.defaultTriageSla?.isActive || !configuration.defaultTriageSla.calendar.isActive) {
    throw new TriageConfigurationError(
      "Configurez d’abord un SLA et un calendrier actifs pour le triage V1.",
    );
  }

  const { queueCode, serviceCode } = triageResourceCodes(department.id);
  const linkedQueue = await tx.queue.findUnique({ where: { provisionedTriageDepartmentId: department.id } });
  const queueCodeOwner = await tx.queue.findUnique({ where: { code: queueCode }, select: { id: true } });
  if (!linkedQueue && queueCodeOwner) {
    throw new TriageConfigurationError(`Le code réservé ${queueCode} est déjà utilisé par une file métier.`);
  }
  const queue = linkedQueue
    ? await tx.queue.update({
        where: { id: linkedQueue.id },
        data: {
          name: `Triage — ${department.name}`,
          departmentId: department.id,
          autoAssignment: false,
          isActive: department.isActive,
        },
      })
    : await tx.queue.create({
        data: {
          code: queueCode,
          name: `Triage — ${department.name}`,
          departmentId: department.id,
          provisionedTriageDepartmentId: department.id,
          autoAssignment: false,
          isActive: department.isActive,
        },
      });

  const linkedService = await tx.serviceCatalogItem.findUnique({ where: { provisionedTriageDepartmentId: department.id } });
  const serviceCodeOwner = await tx.serviceCatalogItem.findUnique({ where: { code: serviceCode }, select: { id: true } });
  if (!linkedService && serviceCodeOwner) {
    throw new TriageConfigurationError(`Le code réservé ${serviceCode} est déjà utilisé par un service métier.`);
  }
  const service = linkedService
    ? await tx.serviceCatalogItem.update({
        where: { id: linkedService.id },
        data: {
          name: `Besoin à qualifier — ${department.name}`,
          description: `Ressource interne de qualification du département ${department.name}.`,
          queueId: queue.id,
          slaId: configuration.defaultTriageSla.id,
          isActive: department.isActive,
        },
      })
    : await tx.serviceCatalogItem.create({
        data: {
          code: serviceCode,
          name: `Besoin à qualifier — ${department.name}`,
          description: `Ressource interne de qualification du département ${department.name}.`,
          ticketType: TicketType.SERVICE_REQUEST,
          category: "À qualifier",
          keywords: [],
          queueId: queue.id,
          priorityDefault: Priority.MEDIUM,
          slaId: configuration.defaultTriageSla.id,
          isActive: department.isActive,
          provisionedTriageDepartmentId: department.id,
        },
      });
  return { queue, service };
}

export async function assertOperationalGlobalTriage(tx: Prisma.TransactionClient) {
  const configuration = await tx.v1Configuration.findUnique({
    where: { id: V1_CONFIGURATION_ID },
    include: {
      globalTriageService: {
        include: {
          queue: {
            include: {
              department: true,
              escalationRules: { where: { isActive: true }, select: { id: true, thresholdPercent: true, targetRole: true } },
            },
          },
          sla: { include: { calendar: { include: { holidays: true } } } },
          escalationRules: { where: { isActive: true }, select: { id: true, thresholdPercent: true, targetRole: true } },
        },
      },
    },
  });
  const service = configuration?.globalTriageService;
  if (!service || !service.isActive || !service.queue.isActive || !service.queue.department.isActive ||
      !service.sla?.isActive || !service.sla.calendar.isActive) {
    throw new TriageConfigurationError(
      "Le triage global V1 n’est pas configuré avec un service, une file, un SLA et un calendrier actifs.",
    );
  }
  return service;
}
