import { prisma } from "../lib/db";
import { provisionDepartmentTriage, TRIAGE_TRANSACTION_OPTIONS, triageResourceCodes } from "../lib/triage-configuration";

const apply = process.argv.includes("--apply");

async function main() {
  const configuration = await prisma.v1Configuration.findUnique({
    where: { id: "default" },
    include: { defaultTriageSla: { include: { calendar: true } } },
  });
  if (!configuration?.defaultTriageSla?.isActive || !configuration.defaultTriageSla.calendar.isActive) {
    process.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", error: "DEFAULT_TRIAGE_SLA_NOT_OPERATIONAL" }, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const results: Array<{ departmentId: string; action: string; detail?: string }> = [];

  for (const department of departments) {
    const { queueCode, serviceCode } = triageResourceCodes(department.id);
    const [linkedQueue, linkedService, queueConflict, serviceConflict] = await Promise.all([
      prisma.queue.findUnique({ where: { provisionedTriageDepartmentId: department.id }, select: { id: true } }),
      prisma.serviceCatalogItem.findUnique({ where: { provisionedTriageDepartmentId: department.id }, select: { id: true } }),
      prisma.queue.findUnique({ where: { code: queueCode }, select: { id: true, provisionedTriageDepartmentId: true } }),
      prisma.serviceCatalogItem.findUnique({ where: { code: serviceCode }, select: { id: true, provisionedTriageDepartmentId: true } }),
    ]);
    if ((!linkedQueue && queueConflict) || (!linkedService && serviceConflict)) {
      results.push({ departmentId: department.id, action: "CONFLICT", detail: "Un code réservé appartient à une ressource non liée; aucune modification." });
      continue;
    }
    if (!apply) {
      results.push({ departmentId: department.id, action: linkedQueue && linkedService ? "UPDATE" : "CREATE" });
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const resources = await provisionDepartmentTriage(tx, department);
      await tx.auditLog.create({
        data: {
          action: "V1_TRIAGE_DEPARTMENT_REPAIRED",
          objectType: "Department",
          objectId: department.id,
          newValue: { queueId: resources.queue.id, serviceId: resources.service.id },
          reason: "Réparation idempotente des ressources TRIAGE V1.",
        },
      });
    }, TRIAGE_TRANSACTION_OPTIONS);
    results.push({ departmentId: department.id, action: linkedQueue && linkedService ? "UPDATED" : "CREATED" });
  }
  process.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", results }, null, 2)}\n`);
  if (results.some((result) => result.action === "CONFLICT")) process.exitCode = 2;
}

main().finally(() => prisma.$disconnect());
