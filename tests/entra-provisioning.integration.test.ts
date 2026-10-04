import { randomUUID } from "node:crypto";
import { RoleCode, UserStatus } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";
import { syncUserFromEntraProfile, type EntraProfile } from "@/lib/entra";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);
const unique = () => randomUUID().replaceAll("-", "");
const profile = (suffix: string, overrides: Partial<EntraProfile> = {}): EntraProfile => ({
  id: `entra-${suffix}`,
  displayName: `Utilisateur ${suffix}`,
  mail: `${suffix}@example.test`,
  department: "  ÉXPERTISE   Comptable ",
  accountEnabled: true,
  ...overrides,
});

async function createDepartment(input: { active?: boolean; mappingActive?: boolean } = {}) {
  const suffix = unique();
  const department = await prisma.department.create({
    data: { code: `D-${suffix}`, name: `Département ${suffix}`, isActive: input.active ?? true },
  });
  const externalValue = `Expertise Comptable ${suffix}`;
  const mapping = await prisma.entraDepartmentMapping.create({
    data: {
      externalValue,
      normalizedValue: normalizeEntraDepartmentValue(externalValue),
      departmentId: department.id,
      isActive: input.mappingActive ?? true,
    },
  });
  return { department, mapping };
}

describe.skipIf(!runDatabaseTests)("provisioning Entra V1 PostgreSQL", () => {
  beforeEach(() => {
    vi.stubEnv("PRODUCT_PROFILE", "v1");
    vi.stubEnv("ADMIN_EMAILS", "");
  });

  it("active au premier login avec une correspondance normalisée et reste idempotent", async () => {
    const suffix = unique();
    const department = await prisma.department.create({
      data: { code: `D-${suffix}`, name: `Département ${suffix}`, isActive: true },
    });
    const departmentValue = `Expertise Comptable ${suffix}`;
    await prisma.entraDepartmentMapping.create({
      data: {
        externalValue: departmentValue,
        normalizedValue: normalizeEntraDepartmentValue(departmentValue),
        departmentId: department.id,
        isActive: true,
      },
    });
    const entraProfile = profile(suffix, { department: `  ÉXPERTISE   Comptable ${suffix} ` });

    const [first, concurrent] = await Promise.all([
      syncUserFromEntraProfile({ profile: entraProfile }),
      syncUserFromEntraProfile({ profile: entraProfile }),
    ]);
    const repeated = await syncUserFromEntraProfile({ profile: entraProfile });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: first.id },
      include: { roleAssignments: { include: { role: true } } },
    });

    expect(first).toMatchObject({ status: UserStatus.ACTIVE, departmentId: department.id });
    expect(concurrent.id).toBe(first.id);
    expect(repeated.id).toBe(first.id);
    expect(user.primaryRoleCode).toBe(RoleCode.REQUESTER);
    expect(user.roleAssignments.filter((assignment) => assignment.role.code === RoleCode.REQUESTER)).toHaveLength(1);
    await expect(prisma.auditLog.count({
      where: { objectId: user.id, action: "ENTRA_REQUESTER_AUTO_PROVISIONED" },
    })).resolves.toBe(1);
    await expect(prisma.userProfileChange.count({ where: { userId: user.id } })).resolves.toBe(3);
  });

  it("laisse en attente un département absent, inconnu ou inactif", async () => {
    const absent = await syncUserFromEntraProfile({ profile: profile(unique(), { department: undefined }) });
    const unknown = await syncUserFromEntraProfile({ profile: profile(unique(), { department: "Inconnu" }) });
    const inactiveMapping = await createDepartment({ mappingActive: false });
    const inactiveMapUser = await syncUserFromEntraProfile({
      profile: profile(unique(), { department: inactiveMapping.mapping.externalValue }),
    });
    const inactiveDepartment = await createDepartment({ active: false });
    const inactiveDepartmentUser = await syncUserFromEntraProfile({
      profile: profile(unique(), { department: inactiveDepartment.mapping.externalValue }),
    });

    for (const result of [absent, unknown, inactiveMapUser, inactiveDepartmentUser]) {
      expect(result).toMatchObject({ status: UserStatus.PENDING_ASSIGNMENT, departmentId: null });
    }
  });

  it("active un profil encore non affecté lorsque la correspondance est ajoutée avant le login suivant", async () => {
    const suffix = unique();
    const entraProfile = profile(suffix, { department: `Support ${suffix}` });
    const first = await syncUserFromEntraProfile({ profile: entraProfile });
    expect(first.status).toBe(UserStatus.PENDING_ASSIGNMENT);
    const department = await prisma.department.create({
      data: { code: `D-${suffix}`, name: `Département ${suffix}`, isActive: true },
    });
    await prisma.entraDepartmentMapping.create({
      data: {
        externalValue: entraProfile.department!,
        normalizedValue: normalizeEntraDepartmentValue(entraProfile.department!),
        departmentId: department.id,
        isActive: true,
      },
    });

    await expect(syncUserFromEntraProfile({ profile: entraProfile })).resolves.toMatchObject({
      id: first.id,
      status: UserStatus.ACTIVE,
      departmentId: department.id,
    });
  });

  it("ne provisionne pas un compte Entra désactivé et préserve un profil déjà géré", async () => {
    const suffix = unique();
    const department = await prisma.department.create({
      data: { code: `D-${suffix}`, name: `Département ${suffix}`, isActive: true },
    });
    const departmentValue = `Expertise Comptable ${suffix}`;
    await prisma.entraDepartmentMapping.create({
      data: { externalValue: departmentValue, normalizedValue: normalizeEntraDepartmentValue(departmentValue), departmentId: department.id },
    });
    const disabled = await syncUserFromEntraProfile({ profile: profile(suffix, { accountEnabled: false, department: departmentValue }) });
    expect(disabled).toMatchObject({ status: UserStatus.DISABLED, departmentId: null });

    const managedSuffix = unique();
    const managedDepartment = await prisma.department.create({
      data: { code: `D-${managedSuffix}`, name: `Département ${managedSuffix}`, isActive: true },
    });
    const managed = await prisma.user.create({
      data: {
        entraObjectId: `entra-${managedSuffix}`,
        entraDisplayName: "Nom Entra initial",
        managedDisplayName: "Nom administré",
        name: "Nom administré",
        email: `${managedSuffix}@example.test`,
        departmentId: managedDepartment.id,
        primaryRoleCode: RoleCode.AGENT,
        status: UserStatus.ACTIVE,
      },
    });
    expect(managed.lastSyncedAt).toBeNull();
    await syncUserFromEntraProfile({ profile: profile(managedSuffix, { displayName: "Nouveau nom Entra" }) });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: managed.id } })).resolves.toMatchObject({
      name: "Nom administré",
      managedDisplayName: "Nom administré",
      departmentId: managedDepartment.id,
      primaryRoleCode: RoleCode.AGENT,
      status: UserStatus.ACTIVE,
    });
  });

  it("préserve le bootstrap administrateur explicite", async () => {
    const suffix = unique();
    const email = `${suffix}@example.test`;
    vi.stubEnv("ADMIN_EMAILS", email);
    const result = await syncUserFromEntraProfile({ profile: profile(suffix, { mail: email, department: undefined }) });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: result.id },
      include: { roleAssignments: { include: { role: true } } },
    });
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.primaryRoleCode).toBe(RoleCode.FUNCTIONAL_ADMIN);
    expect(user.roleAssignments.map((assignment) => assignment.role.code)).toContain(RoleCode.FUNCTIONAL_ADMIN);
  });
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (runDatabaseTests) await prisma.$disconnect();
});
