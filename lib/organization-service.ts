import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { appendAuditLog } from "@/lib/audit";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";
import {
  requireAdminAccess,
  permissionCodes,
  type UserContext,
  AuthorizationError,
} from "@/lib/server-auth";
import {
  entraDepartmentMappingSchema,
  type EntraDepartmentMappingInput,
} from "@/lib/validation";

export class OrganizationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "OrganizationError";
    this.statusCode = statusCode;
  }
}

const departmentSelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} as const;

function requireReason(reason: string): string {
  const value = reason.trim();
  if (value.length < 10) {
    throw new OrganizationError("Un motif d’au moins 10 caractères est obligatoire.", 422);
  }
  return value;
}

async function requireFunctionalAdministrator(): Promise<UserContext> {
  return requireAdminAccess("FUNCTIONAL");
}

export async function listPendingEntraUsers(actor: UserContext) {
  await requireFunctionalAdministratorFor(actor, true);
  return prisma.user.findMany({
    where: { status: { in: [UserStatus.PENDING_ASSIGNMENT, UserStatus.PENDING_VALIDATION] } },
    select: {
      id: true,
      name: true,
      email: true,
      entraObjectId: true,
      entraDepartmentValue: true,
      entraDepartmentNormalizedValue: true,
      status: true,
      lastSyncedAt: true,
      department: { select: departmentSelect },
    },
    orderBy: [{ entraDepartmentValue: "asc" }, { createdAt: "asc" }],
  });
}

export async function listEntraDepartmentMappings(actor: UserContext) {
  await requireFunctionalAdministratorFor(actor, true);
  return prisma.entraDepartmentMapping.findMany({
    include: { department: { select: departmentSelect } },
    orderBy: { externalValue: "asc" },
  });
}

async function requireFunctionalAdministratorFor(
  actor: UserContext,
  allowPendingProvisioning = false,
) {
  // The service is also callable from server components. Re-check the
  // effective session instead of trusting a UserContext supplied by a caller.
  const current = await requireFunctionalAdministrator();
  if (current.id !== actor.id) {
    throw new AuthorizationError("Le contexte utilisateur est obsolète.");
  }
  if (current.status !== UserStatus.ACTIVE && !allowPendingProvisioning) {
    throw new AuthorizationError("Votre compte n’est pas actif.");
  }
  if (!permissionCodes(current).includes("entra-department:manage")) {
    throw new AuthorizationError("La permission de gérer les correspondances Entra n’est pas accordée.");
  }
  return current;
}

export async function upsertEntraDepartmentMapping(
  actor: UserContext,
  input: EntraDepartmentMappingInput,
) {
  await requireFunctionalAdministratorFor(actor, true);
  const parsed = entraDepartmentMappingSchema.parse(input);
  const reason = requireReason(parsed.reason);
  const normalizedValue = normalizeEntraDepartmentValue(parsed.externalValue);

  const department = await prisma.department.findUnique({
    where: { id: parsed.departmentId },
    select: departmentSelect,
  });
  if (!department || !department.isActive) {
    throw new OrganizationError("Le département cible doit être actif.", 422);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.entraDepartmentMapping.findUnique({
      where: { normalizedValue },
      select: {
        id: true,
        externalValue: true,
        normalizedValue: true,
        departmentId: true,
        isActive: true,
      },
    });
    const mapping = await tx.entraDepartmentMapping.upsert({
      where: { normalizedValue },
      update: {
        externalValue: parsed.externalValue,
        departmentId: parsed.departmentId,
        isActive: parsed.isActive,
      },
      create: {
        externalValue: parsed.externalValue,
        normalizedValue,
        departmentId: parsed.departmentId,
        isActive: parsed.isActive,
      },
      include: { department: { select: departmentSelect } },
    });

    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "ENTRA_DEPARTMENT_MAPPING_UPDATED" : "ENTRA_DEPARTMENT_MAPPING_CREATED",
      objectType: "EntraDepartmentMapping",
      objectId: mapping.id,
      oldValue: existing,
      newValue: {
        externalValue: mapping.externalValue,
        normalizedValue: mapping.normalizedValue,
        departmentId: mapping.departmentId,
        isActive: mapping.isActive,
      },
      reason,
    });

    // Existing users are never bulk-updated here. In the V1 profile, only a
    // wholly unassigned pending user may consume this active mapping during
    // their next successful Entra synchronization; that activation is audited.
    const affectedUsers = await tx.user.count({
      where: { entraDepartmentNormalizedValue: normalizedValue },
    });

    return { mapping, affectedUsers };
  });
}
