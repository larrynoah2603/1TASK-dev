import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  provisionDepartmentTriage,
  triageResourceCodes,
  V1_CONFIGURATION_ID,
} from "@/lib/triage-configuration";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);
const suffix = randomUUID().replaceAll("-", "");

describe.skipIf(!runDatabaseTests)("provisionnement TRIAGE V1 PostgreSQL", () => {
  let slaId: string;

  beforeAll(async () => {
    const organization = await prisma.organization.create({ data: { code: `ORG-${suffix}`, name: `Organisation ${suffix}` } });
    const calendar = await prisma.businessCalendar.create({ data: { code: `CAL-${suffix}`, name: `Calendrier ${suffix}`, organizationId: organization.id } });
    const sla = await prisma.sLA.create({ data: { code: `SLA-${suffix}`, name: `SLA ${suffix}`, firstResponseMinutes: 60, resolutionMinutes: 480, calendarId: calendar.id } });
    slaId = sla.id;
    await prisma.v1Configuration.upsert({
      where: { id: V1_CONFIGURATION_ID },
      update: { defaultTriageSlaId: sla.id, globalTriageServiceId: null },
      create: { id: V1_CONFIGURATION_ID, defaultTriageSlaId: sla.id },
    });
  });

  it("crée atomiquement, répare sans doublon et suit un renommage", async () => {
    const created = await prisma.$transaction(async (tx) => {
      const department = await tx.department.create({ data: { code: `D-${suffix}`, name: `Département ${suffix}` } });
      const resources = await provisionDepartmentTriage(tx, department);
      return { department, resources };
    });
    const repaired = await prisma.$transaction((tx) => provisionDepartmentTriage(tx, created.department));
    const renamedDepartment = await prisma.department.update({ where: { id: created.department.id }, data: { code: `DR-${suffix}`, name: `Département renommé ${suffix}` } });
    const renamed = await prisma.$transaction((tx) => provisionDepartmentTriage(tx, renamedDepartment));

    expect(repaired.queue.id).toBe(created.resources.queue.id);
    expect(repaired.service.id).toBe(created.resources.service.id);
    expect(renamed.queue.id).toBe(created.resources.queue.id);
    expect(renamed.service.id).toBe(created.resources.service.id);
    expect(renamed.service.name).toContain("Département renommé");
    await expect(prisma.queue.count({ where: { provisionedTriageDepartmentId: created.department.id } })).resolves.toBe(1);
    await expect(prisma.serviceCatalogItem.count({ where: { provisionedTriageDepartmentId: created.department.id } })).resolves.toBe(1);

    await prisma.v1Configuration.update({ where: { id: V1_CONFIGURATION_ID }, data: { globalTriageServiceId: renamed.service.id } });
    await expect(prisma.v1Configuration.findUnique({
      where: { id: V1_CONFIGURATION_ID },
      select: { globalTriageServiceId: true },
    })).resolves.toEqual({ globalTriageServiceId: renamed.service.id });

    await prisma.$transaction(async (tx) => {
      await tx.v1Configuration.update({
        where: { id: V1_CONFIGURATION_ID },
        data: { globalTriageServiceId: null },
      });
      await tx.serviceCatalogItem.delete({ where: { id: renamed.service.id } });
    });
    await expect(prisma.serviceCatalogItem.findUnique({ where: { id: renamed.service.id } })).resolves.toBeNull();
    expect(slaId).toBeTruthy();
  });

  it("annule le département complet en cas de conflit de code réservé", async () => {
    const departmentId = `c${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const codes = triageResourceCodes(departmentId);
    await expect(prisma.$transaction(async (tx) => {
      const department = await tx.department.create({ data: { id: departmentId, code: `C-${suffix}`, name: `Conflit ${suffix}` } });
      await tx.queue.create({ data: { code: codes.queueCode, name: "File métier en conflit", departmentId: department.id } });
      await provisionDepartmentTriage(tx, department);
    })).rejects.toThrow(/code réservé/);
    await expect(prisma.department.findUnique({ where: { id: departmentId } })).resolves.toBeNull();
  });
});

afterAll(async () => {
  if (runDatabaseTests) await prisma.$disconnect();
});
