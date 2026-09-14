import {
  Prisma,
  RoleCode,
  UserStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { appendAuditLog } from "@/lib/audit";
import { measureServerOperation } from "@/lib/performance";
import { deleteCacheKey } from "@/lib/distributed-cache";
import { createInAppNotification } from "@/lib/notifications";
import {
  requireAdminAccess,
  permissionCodes,
  type UserContext,
  AuthorizationError,
} from "@/lib/server-auth";
import {
  calendarAdminSchema,
  catalogAdminSchema,
  holidayAdminSchema,
  organizationAdminSchema,
  departmentAdminSchema,
  escalationRuleAdminSchema,
  queueAdminSchema,
  roleAssignmentAdminSchema,
  slaAdminSchema,
  teamAdminSchema,
  teamMemberAdminSchema,
  userStatusAdminSchema,
  userProfileAdminSchema,
  type CalendarAdminInput,
  type CatalogAdminInput,
  type HolidayAdminInput,
  type OrganizationAdminInput,
  type DepartmentAdminInput,
  type EscalationRuleAdminInput,
  type QueueAdminInput,
  type RoleAssignmentAdminInput,
  type SlaAdminInput,
  type TeamAdminInput,
  type TeamMemberAdminInput,
  type UserStatusAdminInput,
  type UserProfileAdminInput,
} from "@/lib/validation";

export class AdminServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AdminServiceError";
    this.statusCode = statusCode;
  }
}

async function requireFunctionalAdminFor(actor: UserContext, permission?: string) {
  const current = await requireAdminAccess("FUNCTIONAL");
  if (current.id !== actor.id) {
    throw new AuthorizationError("Le contexte administrateur est obsolète.");
  }
  // A pending functional administrator may inspect the console to complete
  // the Entra department bootstrap, but cannot perform ordinary configuration
  // mutations until their own department is validated.
  if (
    current.status !== UserStatus.ACTIVE &&
    permission &&
    permission !== "user:validate"
  ) {
    throw new AuthorizationError(
      "Validez d’abord la correspondance de votre département Microsoft Entra ID.",
    );
  }
  if (permission && !permissionCodes(current).includes(permission)) {
    throw new AuthorizationError("La permission d’administration requise n’est pas accordée.");
  }
  return current;
}

function plainDepartment(value: { id: string; code: string; name: string; isActive: boolean }) {
  return { id: value.id, code: value.code, name: value.name, isActive: value.isActive };
}

export type AdminConfigurationSection = "departments" | "queues" | "teams" | "catalog" | "sla" | "roles" | "users";

export function getAdminConfiguration(
  actor: UserContext,
  sections?: readonly AdminConfigurationSection[],
) {
  return measureServerOperation("admin.configuration", () => getAdminConfigurationInternal(actor, sections));
}

async function getAdminConfigurationInternal(
  actor: UserContext,
  sections?: readonly AdminConfigurationSection[],
) {
  await requireFunctionalAdminFor(actor);
  const selected = new Set(sections ?? ["departments", "queues", "teams", "catalog", "sla", "roles", "users"]);
  const needs = (...names: AdminConfigurationSection[]) => names.some((name) => selected.has(name));
  const needsDepartments = needs("departments", "queues", "teams", "catalog", "users");
  const needsQueues = needs("queues", "teams", "catalog", "sla", "users");
  const needsUsers = needs("queues", "teams", "roles", "users");
  const needsTeams = needs("teams", "users");
  const needsServices = needs("catalog", "sla");
  const needsSlas = needs("catalog", "sla");
  const needsSlaData = selected.has("sla");

  const [organizations, departments, queues, teams, users, services, slas, calendars, escalationRules, roles, entraMappings, pendingUsers] = await Promise.all([
    needsSlaData ? prisma.organization.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    needsDepartments ? prisma.department.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    needsQueues ? prisma.queue.findMany({
      include: {
        department: true,
        manager: { select: { id: true, name: true, email: true, status: true } },
        teams: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
    }) : Promise.resolve([]),
    needsTeams || !sections ? prisma.team.findMany({
      include: {
        queue: { include: { department: true } },
        lead: { select: { id: true, name: true, email: true, status: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, status: true } } },
          orderBy: { user: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
    }) : Promise.resolve([]),
    needsUsers ? prisma.user.findMany({
      select: {
        id: true,
        name: true,
        entraDisplayName: true,
        managedDisplayName: true,
        email: true,
        status: true,
        administrativelyDisabled: true,
        entraObjectId: true,
        entraDepartmentValue: true,
        entraDepartmentNormalizedValue: true,
        jobTitle: true,
        lastSyncedAt: true,
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
        entraManager: { select: { id: true, name: true, email: true } },
        entraManagerObjectId: true,
        entraManagerDisplayName: true,
        entraManagerEmail: true,
        primaryRoleCode: true,
        primaryTeam: {
          select: {
            id: true,
            name: true,
            queue: { select: { id: true, name: true, departmentId: true } },
          },
        },
        authorizedQueue: { select: { id: true, name: true, departmentId: true } },
        roleAssignments: { select: { role: { select: { code: true, name: true } }, scopeId: true } },
        teamMemberships: { select: { isActive: true, team: { select: { id: true, name: true, queue: { select: { name: true } } } } } },
      },
      orderBy: { name: "asc" },
      take: 100,
    }) : Promise.resolve([]),
    needsServices ? prisma.serviceCatalogItem.findMany({
      include: {
        queue: { include: { department: true } },
        sla: { include: { calendar: true } },
        escalationRules: { where: { isActive: true }, orderBy: { thresholdPercent: "asc" } },
      },
      orderBy: { name: "asc" },
    }) : Promise.resolve([]),
    needsSlas ? prisma.sLA.findMany({ include: { calendar: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    needsSlaData ? prisma.businessCalendar.findMany({ include: { organization: true, holidays: { orderBy: { date: "asc" } } }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    needsSlaData ? prisma.escalationRule.findMany({
      include: {
        queue: { select: { id: true, code: true, name: true } },
        serviceItem: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ thresholdPercent: "asc" }, { name: "asc" }],
    }) : Promise.resolve([]),
    (selected.has("roles") || selected.has("users") || !sections) ? prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { code: "asc" } }) : Promise.resolve([]),
    selected.has("departments") || !sections ? prisma.entraDepartmentMapping.findMany({ include: { department: true }, orderBy: { externalValue: "asc" } }) : Promise.resolve([]),
    selected.has("departments") || !sections ? prisma.user.findMany({ where: { status: { in: [UserStatus.PENDING_ASSIGNMENT, UserStatus.PENDING_VALIDATION] } }, select: { id: true, name: true, email: true, entraDepartmentValue: true }, orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
  ]);
  return { organizations, departments, queues, teams, users, services, slas, calendars, escalationRules, roles, entraMappings, pendingUsers };
}

export async function getAdminUserSummary(actor: UserContext) {
  await requireFunctionalAdminFor(actor);
  const grouped = await prisma.user.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((item) => [item.status, item._count._all]));
  return {
    total: grouped.reduce((sum, item) => sum + item._count._all, 0),
    active: counts.get(UserStatus.ACTIVE) ?? 0,
  };
}

export async function saveDepartment(actor: UserContext, id: string | undefined, input: DepartmentAdminInput) {
  await requireFunctionalAdminFor(actor, "organization:manage");
  const parsed = departmentAdminSchema.parse(input);
  const existing = id ? await prisma.department.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("Département introuvable.", 404);
  const result = await prisma.$transaction(async (tx) => {
    const department = existing
      ? await tx.department.update({ where: { id }, data: { code: parsed.code, name: parsed.name, isActive: parsed.isActive } })
      : await tx.department.create({ data: { code: parsed.code, name: parsed.name, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "DEPARTMENT_UPDATED" : "DEPARTMENT_CREATED",
      objectType: "Department",
      objectId: department.id,
      oldValue: existing ? plainDepartment(existing) : null,
      newValue: plainDepartment(department),
      reason: parsed.reason,
    });
    return department;
  });
  await deleteCacheKey("catalog:active:v1");
  return result;
}

async function validateManager(managerId: string | null | undefined) {
  if (!managerId) return;
  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      status: UserStatus.ACTIVE,
      roleAssignments: { some: { role: { code: { in: [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] } } } },
    },
    select: { id: true },
  });
  if (!manager) throw new AdminServiceError("Le responsable de file doit être actif et posséder un rôle de responsable ou d’administrateur.", 422);
}

export async function saveQueue(actor: UserContext, id: string | undefined, input: QueueAdminInput) {
  await requireFunctionalAdminFor(actor, "organization:manage");
  const parsed = queueAdminSchema.parse(input);
  const existing = id ? await prisma.queue.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("File introuvable.", 404);
  const department = await prisma.department.findFirst({ where: { id: parsed.departmentId, isActive: true }, select: { id: true } });
  if (!department) throw new AdminServiceError("La file doit être rattachée à un département actif.", 422);
  await validateManager(parsed.managerId);
  const result = await prisma.$transaction(async (tx) => {
    const queue = existing
      ? await tx.queue.update({ where: { id }, data: { code: parsed.code, name: parsed.name, departmentId: parsed.departmentId, managerId: parsed.managerId ?? null, autoAssignment: parsed.autoAssignment, isActive: parsed.isActive } })
      : await tx.queue.create({ data: { code: parsed.code, name: parsed.name, departmentId: parsed.departmentId, managerId: parsed.managerId ?? null, autoAssignment: parsed.autoAssignment, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "QUEUE_UPDATED" : "QUEUE_CREATED",
      objectType: "Queue",
      objectId: queue.id,
      oldValue: existing ? { code: existing.code, name: existing.name, departmentId: existing.departmentId, managerId: existing.managerId, autoAssignment: existing.autoAssignment, isActive: existing.isActive } : null,
      newValue: { code: queue.code, name: queue.name, departmentId: queue.departmentId, managerId: queue.managerId, autoAssignment: queue.autoAssignment, isActive: queue.isActive },
      reason: parsed.reason,
    });
    return queue;
  });
  await deleteCacheKey("catalog:active:v1");
  return result;
}

export async function saveTeam(actor: UserContext, id: string | undefined, input: TeamAdminInput) {
  await requireFunctionalAdminFor(actor, "organization:manage");
  const parsed = teamAdminSchema.parse(input);
  const existing = id ? await prisma.team.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("Équipe introuvable.", 404);
  const queue = await prisma.queue.findFirst({ where: { id: parsed.queueId, isActive: true, department: { isActive: true } }, select: { id: true, departmentId: true } });
  if (!queue) throw new AdminServiceError("L’équipe doit être rattachée à une file active.", 422);
  if (parsed.leadId) {
    const lead = await prisma.user.findFirst({ where: { id: parsed.leadId, status: UserStatus.ACTIVE, departmentId: queue.departmentId }, select: { id: true } });
    if (!lead) throw new AdminServiceError("Le responsable d’équipe doit être actif dans le département de la file.", 422);
  }
  return prisma.$transaction(async (tx) => {
    const team = existing
      ? await tx.team.update({ where: { id }, data: { name: parsed.name, queueId: parsed.queueId, leadId: parsed.leadId ?? null, isActive: parsed.isActive } })
      : await tx.team.create({ data: { name: parsed.name, queueId: parsed.queueId, leadId: parsed.leadId ?? null, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "TEAM_UPDATED" : "TEAM_CREATED",
      objectType: "Team",
      objectId: team.id,
      oldValue: existing ? { name: existing.name, queueId: existing.queueId, leadId: existing.leadId, isActive: existing.isActive } : null,
      newValue: { name: team.name, queueId: team.queueId, leadId: team.leadId, isActive: team.isActive },
      reason: parsed.reason,
    });
    return team;
  });
}

export async function saveTeamMember(actor: UserContext, teamId: string, input: TeamMemberAdminInput) {
  await requireFunctionalAdminFor(actor, "organization:manage");
  const parsed = teamMemberAdminSchema.parse(input);
  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { queue: true } });
  if (!team || !team.isActive || !team.queue.isActive) throw new AdminServiceError("L’équipe ou sa file est inactive ou introuvable.", 422);
  const user = await prisma.user.findFirst({ where: { id: parsed.userId, status: UserStatus.ACTIVE, departmentId: team.queue.departmentId, roleAssignments: { some: { role: { code: RoleCode.AGENT } } } }, select: { id: true } });
  if (!user) throw new AdminServiceError("L’agent doit être actif, posséder le rôle AGENT et appartenir au département de la file.", 422);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: parsed.userId } } });
    const member = existing
      ? await tx.teamMember.update({ where: { id: existing.id }, data: { isActive: parsed.isActive, isAvailable: parsed.isAvailable, skills: parsed.skills, leftAt: parsed.isActive ? null : new Date() } })
      : await tx.teamMember.create({ data: { teamId, userId: parsed.userId, isActive: parsed.isActive, isAvailable: parsed.isAvailable, skills: parsed.skills } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "TEAM_MEMBER_UPDATED" : "TEAM_MEMBER_CREATED",
      objectType: "TeamMember",
      objectId: member.id,
      oldValue: existing ? { teamId, userId: parsed.userId, isActive: existing.isActive, isAvailable: existing.isAvailable, skills: existing.skills } : null,
      newValue: { teamId, userId: member.userId, isActive: member.isActive, isAvailable: member.isAvailable, skills: member.skills },
      reason: parsed.reason,
    });
    return member;
  });
}

async function validateCatalogReferences(input: CatalogAdminInput) {
  const queue = await prisma.queue.findFirst({ where: { id: input.queueId, isActive: true, department: { isActive: true } }, select: { id: true } });
  if (!queue) throw new AdminServiceError("Le service doit être rattaché à une file active.", 422);
  const sla = await prisma.sLA.findFirst({ where: { id: input.slaId, isActive: true, calendar: { isActive: true } }, select: { id: true } });
  if (!sla) throw new AdminServiceError("Le service doit utiliser un SLA actif sur un calendrier actif.", 422);
}

export async function saveCatalogItem(actor: UserContext, id: string | undefined, input: CatalogAdminInput) {
  await requireFunctionalAdminFor(actor, "catalog:manage");
  const parsed = catalogAdminSchema.parse(input);
  const existing = id ? await prisma.serviceCatalogItem.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("Service du catalogue introuvable.", 404);
  await validateCatalogReferences(parsed);
  const result = await prisma.$transaction(async (tx) => {
    const service = existing
      ? await tx.serviceCatalogItem.update({ where: { id }, data: { code: parsed.code, name: parsed.name, description: parsed.description ?? null, ticketType: parsed.ticketType, category: parsed.category, keywords: parsed.keywords, queueId: parsed.queueId, priorityDefault: parsed.priorityDefault, slaId: parsed.slaId, isActive: parsed.isActive } })
      : await tx.serviceCatalogItem.create({ data: { code: parsed.code, name: parsed.name, description: parsed.description ?? null, ticketType: parsed.ticketType, category: parsed.category, keywords: parsed.keywords, queueId: parsed.queueId, priorityDefault: parsed.priorityDefault, slaId: parsed.slaId, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "CATALOG_ITEM_UPDATED" : "CATALOG_ITEM_CREATED",
      objectType: "ServiceCatalogItem",
      objectId: service.id,
      oldValue: existing ? { code: existing.code, name: existing.name, ticketType: existing.ticketType, category: existing.category, keywords: existing.keywords, queueId: existing.queueId, priorityDefault: existing.priorityDefault, slaId: existing.slaId, isActive: existing.isActive } : null,
      newValue: { code: service.code, name: service.name, ticketType: service.ticketType, category: service.category, keywords: service.keywords, queueId: service.queueId, priorityDefault: service.priorityDefault, slaId: service.slaId, isActive: service.isActive },
      reason: parsed.reason,
    });
    return service;
  });
  await deleteCacheKey("catalog:active:v1");
  return result;
}

export async function saveOrganization(actor: UserContext, id: string | undefined, input: OrganizationAdminInput) {
  await requireFunctionalAdminFor(actor, "organization:manage");
  const parsed = organizationAdminSchema.parse(input);
  const existing = id ? await prisma.organization.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("Organisation introuvable.", 404);
  return prisma.$transaction(async (tx) => {
    const organization = existing
      ? await tx.organization.update({ where: { id }, data: { code: parsed.code, name: parsed.name, isActive: parsed.isActive } })
      : await tx.organization.create({ data: { code: parsed.code, name: parsed.name, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "ORGANIZATION_UPDATED" : "ORGANIZATION_CREATED",
      objectType: "Organization",
      objectId: organization.id,
      oldValue: existing ? { code: existing.code, name: existing.name, isActive: existing.isActive } : null,
      newValue: { code: organization.code, name: organization.name, isActive: organization.isActive },
      reason: parsed.reason,
    });
    return organization;
  });
}

export async function saveCalendar(actor: UserContext, id: string | undefined, input: CalendarAdminInput) {
  await requireFunctionalAdminFor(actor, "sla:manage");
  const parsed = calendarAdminSchema.parse(input);
  const existing = id ? await prisma.businessCalendar.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("Calendrier introuvable.", 404);
  const organization = await prisma.organization.findFirst({ where: { id: parsed.organizationId, isActive: true }, select: { id: true } });
  if (!organization) throw new AdminServiceError("Le calendrier doit être rattaché à une organisation active.", 422);
  return prisma.$transaction(async (tx) => {
    const calendar = existing
      ? await tx.businessCalendar.update({ where: { id }, data: { code: parsed.code, name: parsed.name, organizationId: parsed.organizationId, timezone: parsed.timezone, workingDays: parsed.workingDays, workdayStartMinute: parsed.workdayStartMinute, workdayEndMinute: parsed.workdayEndMinute, isActive: parsed.isActive } })
      : await tx.businessCalendar.create({ data: { code: parsed.code, name: parsed.name, organizationId: parsed.organizationId, timezone: parsed.timezone, workingDays: parsed.workingDays, workdayStartMinute: parsed.workdayStartMinute, workdayEndMinute: parsed.workdayEndMinute, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "BUSINESS_CALENDAR_UPDATED" : "BUSINESS_CALENDAR_CREATED",
      objectType: "BusinessCalendar",
      objectId: calendar.id,
      oldValue: existing ? { code: existing.code, name: existing.name, timezone: existing.timezone, workingDays: existing.workingDays, workdayStartMinute: existing.workdayStartMinute, workdayEndMinute: existing.workdayEndMinute, isActive: existing.isActive } : null,
      newValue: { code: calendar.code, name: calendar.name, timezone: calendar.timezone, workingDays: calendar.workingDays, workdayStartMinute: calendar.workdayStartMinute, workdayEndMinute: calendar.workdayEndMinute, isActive: calendar.isActive },
      reason: parsed.reason,
    });
    return calendar;
  });
}

export async function saveHoliday(actor: UserContext, calendarId: string, input: HolidayAdminInput) {
  await requireFunctionalAdminFor(actor, "sla:manage");
  const parsed = holidayAdminSchema.parse(input);
  const calendar = await prisma.businessCalendar.findUnique({ where: { id: calendarId }, select: { id: true, isActive: true } });
  if (!calendar || !calendar.isActive) throw new AdminServiceError("Le calendrier est introuvable ou inactif.", 422);
  const duplicate = await prisma.holiday.findUnique({ where: { calendarId_date: { calendarId, date: parsed.date } }, select: { id: true } });
  if (duplicate) throw new AdminServiceError("Cette date existe déjà dans le calendrier.", 409);
  return prisma.$transaction(async (tx) => {
    const holiday = await tx.holiday.create({ data: { calendarId, date: parsed.date, name: parsed.name } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: "BUSINESS_CALENDAR_HOLIDAY_CREATED",
      objectType: "Holiday",
      objectId: holiday.id,
      newValue: { calendarId, date: holiday.date, name: holiday.name },
      reason: parsed.reason,
    });
    return holiday;
  });
}

export async function updateHoliday(actor: UserContext, holidayId: string, input: HolidayAdminInput) {
  await requireFunctionalAdminFor(actor, "sla:manage");
  const parsed = holidayAdminSchema.parse(input);
  const existing = await prisma.holiday.findUnique({ where: { id: holidayId } });
  if (!existing) throw new AdminServiceError("Jour férié introuvable.", 404);
  const duplicate = await prisma.holiday.findUnique({ where: { calendarId_date: { calendarId: existing.calendarId, date: parsed.date } }, select: { id: true } });
  if (duplicate && duplicate.id !== holidayId) throw new AdminServiceError("Cette date existe déjà dans le calendrier.", 409);
  return prisma.$transaction(async (tx) => {
    const holiday = await tx.holiday.update({ where: { id: holidayId }, data: { date: parsed.date, name: parsed.name } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: "BUSINESS_CALENDAR_HOLIDAY_UPDATED",
      objectType: "Holiday",
      objectId: holiday.id,
      oldValue: { calendarId: existing.calendarId, date: existing.date, name: existing.name },
      newValue: { calendarId: holiday.calendarId, date: holiday.date, name: holiday.name },
      reason: parsed.reason,
    });
    return holiday;
  });
}

export async function saveSla(actor: UserContext, id: string | undefined, input: SlaAdminInput) {
  await requireFunctionalAdminFor(actor, "sla:manage");
  const parsed = slaAdminSchema.parse(input);
  const existing = id ? await prisma.sLA.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("SLA introuvable.", 404);
  const calendar = await prisma.businessCalendar.findFirst({ where: { id: parsed.calendarId, isActive: true }, select: { id: true } });
  if (!calendar) throw new AdminServiceError("Le SLA doit être rattaché à un calendrier actif.", 422);
  const result = await prisma.$transaction(async (tx) => {
    const sla = existing
      ? await tx.sLA.update({ where: { id }, data: { code: parsed.code, name: parsed.name, firstResponseMinutes: parsed.firstResponseMinutes, resolutionMinutes: parsed.resolutionMinutes, calendarId: parsed.calendarId, calculationMode: parsed.calculationMode, alertThresholds: parsed.alertThresholds, isActive: parsed.isActive } })
      : await tx.sLA.create({ data: { code: parsed.code, name: parsed.name, firstResponseMinutes: parsed.firstResponseMinutes, resolutionMinutes: parsed.resolutionMinutes, calendarId: parsed.calendarId, calculationMode: parsed.calculationMode, alertThresholds: parsed.alertThresholds, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "SLA_UPDATED" : "SLA_CREATED",
      objectType: "SLA",
      objectId: sla.id,
      oldValue: existing ? { code: existing.code, name: existing.name, firstResponseMinutes: existing.firstResponseMinutes, resolutionMinutes: existing.resolutionMinutes, calendarId: existing.calendarId, calculationMode: existing.calculationMode, alertThresholds: existing.alertThresholds, isActive: existing.isActive } : null,
      newValue: { code: sla.code, name: sla.name, firstResponseMinutes: sla.firstResponseMinutes, resolutionMinutes: sla.resolutionMinutes, calendarId: sla.calendarId, calculationMode: sla.calculationMode, alertThresholds: sla.alertThresholds, isActive: sla.isActive },
      reason: parsed.reason,
    });
    return sla;
  });
  await deleteCacheKey("catalog:active:v1");
  return result;
}

export async function saveEscalationRule(actor: UserContext, id: string | undefined, input: EscalationRuleAdminInput) {
  await requireFunctionalAdminFor(actor, "sla:manage");
  const parsed = escalationRuleAdminSchema.parse(input);
  const existing = id ? await prisma.escalationRule.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new AdminServiceError("Règle d’escalade introuvable.", 404);
  if (parsed.queueId) {
    const queue = await prisma.queue.findFirst({ where: { id: parsed.queueId, isActive: true }, select: { id: true } });
    if (!queue) throw new AdminServiceError("La file ciblée doit être active.", 422);
  }
  if (parsed.serviceItemId) {
    const service = await prisma.serviceCatalogItem.findFirst({ where: { id: parsed.serviceItemId, isActive: true }, select: { id: true } });
    if (!service) throw new AdminServiceError("Le service ciblé doit être actif.", 422);
  }
  return prisma.$transaction(async (tx) => {
    const rule = existing
      ? await tx.escalationRule.update({ where: { id }, data: { name: parsed.name, thresholdPercent: parsed.thresholdPercent, queueId: parsed.queueId ?? null, serviceItemId: parsed.serviceItemId ?? null, targetRole: parsed.targetRole, isActive: parsed.isActive } })
      : await tx.escalationRule.create({ data: { name: parsed.name, thresholdPercent: parsed.thresholdPercent, queueId: parsed.queueId ?? null, serviceItemId: parsed.serviceItemId ?? null, targetRole: parsed.targetRole, isActive: parsed.isActive } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "ESCALATION_RULE_UPDATED" : "ESCALATION_RULE_CREATED",
      objectType: "EscalationRule",
      objectId: rule.id,
      oldValue: existing ? { name: existing.name, thresholdPercent: existing.thresholdPercent, queueId: existing.queueId, serviceItemId: existing.serviceItemId, targetRole: existing.targetRole, isActive: existing.isActive } : null,
      newValue: { name: rule.name, thresholdPercent: rule.thresholdPercent, queueId: rule.queueId, serviceItemId: rule.serviceItemId, targetRole: rule.targetRole, isActive: rule.isActive },
      reason: parsed.reason,
    });
    return rule;
  });
}

export async function assignAdminRole(actor: UserContext, userId: string, input: RoleAssignmentAdminInput) {
  await requireFunctionalAdminFor(actor, "role:manage");
  const parsed = roleAssignmentAdminSchema.parse(input);
  const [user, role, scope] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
    prisma.role.findUnique({ where: { code: parsed.roleCode }, select: { id: true, code: true } }),
    parsed.scopeId ? prisma.permissionScope.findUnique({ where: { id: parsed.scopeId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!user) throw new AdminServiceError("Utilisateur introuvable.", 404);
  if (user.status === UserStatus.DISABLED) throw new AdminServiceError("Un utilisateur désactivé ne peut pas recevoir de rôle.", 422);
  if (!role) throw new AdminServiceError("Rôle introuvable.", 422);
  if (parsed.scopeId && !scope) throw new AdminServiceError("Périmètre introuvable.", 422);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userRole.findFirst({ where: { userId, roleId: role.id, scopeId: parsed.scopeId ?? null } });
    const assignment = existing
      ? existing
      : await tx.userRole.create({ data: { userId, roleId: role.id, scopeId: parsed.scopeId ?? null, assignedById: actor.id } });
    await appendAuditLog(tx, {
      actorId: actor.id,
      action: existing ? "USER_ROLE_ALREADY_PRESENT" : "USER_ROLE_ASSIGNED",
      objectType: "UserRole",
      objectId: assignment.id,
      oldValue: existing ? { userId, roleCode: parsed.roleCode, scopeId: parsed.scopeId ?? null } : null,
      newValue: { userId, roleCode: parsed.roleCode, scopeId: parsed.scopeId ?? null },
      reason: parsed.reason,
    });
    return assignment;
  });
}

/** Compatibility wrapper for callers that only have a status mutation. */
export async function setUserStatusLegacy(
  actor: UserContext,
  userId: string,
  input: UserStatusAdminInput,
) {
  return setUserStatus(actor, userId, input);
}

const managedProfileFields = [
  "managedDisplayName",
  "departmentId",
  "managerId",
  "primaryRoleCode",
  "primaryTeamId",
  "authorizedQueueId",
  "status",
] as const;

type ManagedProfileField = (typeof managedProfileFields)[number];

function profileJson(value: string | null | UserStatus | RoleCode) {
  return value === null ? Prisma.JsonNull : value;
}

async function validateManagedProfileReferences(
  userId: string,
  input: UserProfileAdminInput,
) {
  const department = input.departmentId
    ? await prisma.department.findFirst({
        where: { id: input.departmentId, isActive: true },
        select: { id: true },
      })
    : null;
  if (input.status === "ACTIVE" && !department) {
    throw new AdminServiceError("Un utilisateur actif doit être rattaché à un département actif.", 422);
  }
  if (input.departmentId && !department) {
    throw new AdminServiceError("Le département sélectionné est introuvable ou inactif.", 422);
  }

  if (input.status === "ACTIVE" && !input.primaryRoleCode) {
    throw new AdminServiceError("Un rôle principal est obligatoire pour valider un utilisateur.", 422);
  }

  if (input.managerId) {
    if (input.managerId === userId) {
      throw new AdminServiceError("Un utilisateur ne peut pas être son propre manager applicatif.", 422);
    }
    const manager = await prisma.user.findFirst({
      where: {
        id: input.managerId,
        status: UserStatus.ACTIVE,
        administrativelyDisabled: false,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      select: { id: true },
    });
    if (!manager) {
      throw new AdminServiceError("Le manager applicatif doit être actif et rattaché au même département.", 422);
    }
  }

  const team = input.primaryTeamId
    ? await prisma.team.findFirst({
        where: {
          id: input.primaryTeamId,
          isActive: true,
          queue: { isActive: true, department: { isActive: true } },
        },
        select: { id: true, queue: { select: { departmentId: true } } },
      })
    : null;
  if (input.primaryTeamId && !team) {
    throw new AdminServiceError("L’équipe principale doit être active.", 422);
  }
  if (team && input.departmentId && team.queue.departmentId !== input.departmentId) {
    throw new AdminServiceError("L’équipe principale doit appartenir au département sélectionné.", 422);
  }

  const queue = input.authorizedQueueId
    ? await prisma.queue.findFirst({
        where: { id: input.authorizedQueueId, isActive: true, department: { isActive: true } },
        select: { id: true, departmentId: true },
      })
    : null;
  if (input.authorizedQueueId && !queue) {
    throw new AdminServiceError("La file autorisée doit être active.", 422);
  }
  if (queue && input.departmentId && queue.departmentId !== input.departmentId) {
    throw new AdminServiceError("La file autorisée doit appartenir au département sélectionné.", 422);
  }

  const role = input.primaryRoleCode
    ? await prisma.role.findUnique({ where: { code: input.primaryRoleCode }, select: { id: true, code: true } })
    : null;
  if (input.primaryRoleCode && !role) {
    throw new AdminServiceError("Le rôle principal est introuvable.", 422);
  }
  return { role };
}

export async function updateManagedUserProfile(
  actor: UserContext,
  userId: string,
  input: UserProfileAdminInput,
) {
  const current = await requireFunctionalAdminFor(actor, "user:validate");
  const parsed = userProfileAdminSchema.parse(input);
  if (current.id === userId && parsed.status === "DISABLED") {
    throw new AdminServiceError("Un administrateur ne peut pas désactiver son propre compte.", 422);
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      entraObjectId: true,
      entraDisplayName: true,
      managedDisplayName: true,
      departmentId: true,
      managerId: true,
      primaryRoleCode: true,
      primaryTeamId: true,
      authorizedQueueId: true,
      status: true,
      administrativelyDisabled: true,
      roleAssignments: { select: { role: { select: { code: true } }, scopeId: true } },
    },
  });
  if (!target) throw new AdminServiceError("Utilisateur introuvable.", 404);

  const { role } = await validateManagedProfileReferences(userId, parsed);
  const isGlobalFunctionalAdmin = target.roleAssignments.some(
    (assignment) => assignment.role.code === RoleCode.FUNCTIONAL_ADMIN && !assignment.scopeId,
  );
  if (parsed.status === "DISABLED" && isGlobalFunctionalAdmin) {
    const activeGlobalAdmins = await prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        roleAssignments: { some: { role: { code: RoleCode.FUNCTIONAL_ADMIN }, scopeId: null } },
      },
    });
    if (activeGlobalAdmins <= 1) {
      throw new AdminServiceError("Le dernier administrateur fonctionnel global ne peut pas être désactivé.", 422);
    }
  }

  const oldProfile: Record<ManagedProfileField, string | null | UserStatus | RoleCode> = {
    managedDisplayName: target.managedDisplayName,
    departmentId: target.departmentId,
    managerId: target.managerId,
    primaryRoleCode: target.primaryRoleCode,
    primaryTeamId: target.primaryTeamId,
    authorizedQueueId: target.authorizedQueueId,
    status: target.status,
  };
  const newProfile: Record<ManagedProfileField, string | null | UserStatus | RoleCode> = {
    managedDisplayName: parsed.managedDisplayName,
    departmentId: parsed.departmentId,
    managerId: parsed.managerId,
    primaryRoleCode: parsed.primaryRoleCode,
    primaryTeamId: parsed.primaryTeamId,
    authorizedQueueId: parsed.authorizedQueueId,
    status: parsed.status as UserStatus,
  };
  const changedFields = managedProfileFields.filter((field) => oldProfile[field] !== newProfile[field]);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        managedDisplayName: parsed.managedDisplayName,
        name: parsed.managedDisplayName,
        departmentId: parsed.departmentId,
        managerId: parsed.managerId,
        primaryRoleCode: parsed.primaryRoleCode,
        primaryTeamId: parsed.primaryTeamId,
        authorizedQueueId: parsed.authorizedQueueId,
        status: parsed.status as UserStatus,
        administrativelyDisabled: parsed.status === "DISABLED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        managedDisplayName: true,
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    if (role) {
      const existingRole = await tx.userRole.findFirst({
        where: { userId, roleId: role.id, scopeId: null },
      });
      if (!existingRole) {
        await tx.userRole.create({
          data: { userId, roleId: role.id, scopeId: null, assignedById: current.id },
        });
      }
    }

    if (parsed.primaryTeamId) {
      await tx.teamMember.upsert({
        where: { teamId_userId: { teamId: parsed.primaryTeamId, userId } },
        update: { isActive: true, isAvailable: parsed.status === "ACTIVE" },
        create: {
          teamId: parsed.primaryTeamId,
          userId,
          isActive: true,
          isAvailable: parsed.status === "ACTIVE",
        },
      });
    }

    for (const field of changedFields) {
      await tx.userProfileChange.create({
        data: {
          userId,
          actorId: current.id,
          field,
          oldValue: profileJson(oldProfile[field]),
          newValue: profileJson(newProfile[field]),
          reason: parsed.reason,
        },
      });
    }

    await appendAuditLog(tx, {
      actorId: current.id,
      action: changedFields.includes("status") ? "USER_PROFILE_VALIDATED_OR_UPDATED" : "USER_PROFILE_UPDATED",
      objectType: "User",
      objectId: userId,
      oldValue: {
        ...oldProfile,
        entraObjectId: target.entraObjectId,
        email: target.email,
      },
      newValue: {
        ...newProfile,
        entraObjectId: target.entraObjectId,
        email: target.email,
      },
      reason: parsed.reason,
    });

    const permissionImpact = changedFields.some((field) =>
      ["departmentId", "primaryRoleCode", "primaryTeamId", "authorizedQueueId", "status"].includes(field),
    );
    if (permissionImpact && userId !== current.id) {
      const departmentLabel = updated.department?.name ?? "non renseigné";
      await createInAppNotification(tx, {
        recipientId: userId,
        type: "ADMINISTRATIVE_ACTION",
        title: "Votre profil 1TASK a été mis à jour",
        body: parsed.status === "ACTIVE"
          ? "Votre profil est validé. Département : " + departmentLabel + ". Motif : " + parsed.reason
          : "Une modification administrative affecte votre accès ou votre périmètre. Motif : " + parsed.reason,
      });
    }
    return updated;
  }, {
    maxWait: 10_000,
    timeout: 15_000,
  });
}

export async function getManagedUserProfile(actor: UserContext, userId: string) {
  await requireFunctionalAdminFor(actor);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      entraObjectId: true,
      entraDisplayName: true,
      entraManagerObjectId: true,
      entraManagerDisplayName: true,
      entraManagerEmail: true,
      managedDisplayName: true,
      department: { select: { id: true, code: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
      primaryRoleCode: true,
      primaryTeam: { select: { id: true, name: true } },
      authorizedQueue: { select: { id: true, code: true, name: true } },
      status: true,
      profileChanges: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!user) throw new AdminServiceError("Utilisateur introuvable.", 404);
  return user;
}

/** Backward-compatible status endpoint; all mutations now pass through the
 * complete managed-profile validation and audit path. */
export async function setUserStatus(
  actor: UserContext,
  userId: string,
  input: UserStatusAdminInput,
) {
  const parsed = userStatusAdminSchema.parse(input);
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      managedDisplayName: true,
      entraDisplayName: true,
      name: true,
      departmentId: true,
      managerId: true,
      primaryRoleCode: true,
      primaryTeamId: true,
      authorizedQueueId: true,
    },
  });
  if (!target) throw new AdminServiceError("Utilisateur introuvable.", 404);
  return updateManagedUserProfile(actor, userId, {
    managedDisplayName: target.managedDisplayName ?? target.entraDisplayName ?? target.name,
    departmentId: target.departmentId,
    managerId: target.managerId,
    primaryRoleCode: target.primaryRoleCode,
    primaryTeamId: target.primaryTeamId,
    authorizedQueueId: target.authorizedQueueId,
    status: parsed.status,
    reason: parsed.reason,
  });
}
