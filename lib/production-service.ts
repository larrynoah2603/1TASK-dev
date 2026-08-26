import { AssetStatus, MissionStatus, RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManageQueue, hasGlobalRole } from "@/lib/access-control";
import { assertFunctionalAssetAdministrator } from "@/lib/asset-access";
import {
  AuthorizationError,
  ResourceNotFoundError,
  requireCurrentActor,
  requireTicketAccess,
  toAccessSubject,
  type UserContext,
} from "@/lib/server-auth";
import { appendAuditLog } from "@/lib/audit";
import { visibleTicketWhere } from "@/lib/ticket-service";
import {
  assetMovementSchema,
  assetSchema,
  clientAccountSchema,
  dossierSchema,
  missionSchema,
  worklogSchema,
  type AssetInput,
  type AssetMovementInput,
  type ClientAccountInput,
  type DossierInput,
  type MissionInput,
  type WorklogInput,
} from "@/lib/validation";

export function getProductionTimestamp() {
  return Date.now();
}

function isGlobalAdmin(actor: UserContext): boolean {
  return hasGlobalRole(toAccessSubject(actor), RoleCode.FUNCTIONAL_ADMIN);
}

function ensurePermission(actor: UserContext, permission: string) {
  const permissions = actor.roleAssignments.flatMap((assignment) => assignment.role.permissions.map((item) => item.permission.code));
  if (!permissions.includes(permission)) throw new AuthorizationError("La permission requise n’est pas accordée.");
}

function departmentAllowed(actor: UserContext, departmentId: string | null | undefined): boolean {
  return isGlobalAdmin(actor) || !departmentId || actor.departmentId === departmentId;
}

export async function listClientAccounts(actor: UserContext, query?: string) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const normalizedQuery = query?.trim();
  return prisma.clientAccount.findMany({
    where: {
      isActive: true,
      ...(normalizedQuery ? { OR: [
        { code: { contains: normalizedQuery, mode: "insensitive" as const } },
        { name: { contains: normalizedQuery, mode: "insensitive" as const } },
      ] } : {}),
    },
    include: { _count: { select: { dossiers: true } } },
    orderBy: { name: "asc" },
  });
}

export async function listDossiersForViewer(actor: UserContext, query?: string) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const normalizedQuery = query?.trim();
  const where = {
    isActive: true,
    ...(normalizedQuery ? { OR: [
      { code: { contains: normalizedQuery, mode: "insensitive" as const } },
      { name: { contains: normalizedQuery, mode: "insensitive" as const } },
      { client: { name: { contains: normalizedQuery, mode: "insensitive" as const } } },
    ] } : {}),
    ...(isGlobalAdmin(actor) ? {} : { missions: { some: { departmentId: actor.departmentId ?? "__none__" } } }),
  };
  return prisma.clientDossier.findMany({
    where,
    include: { client: true, missions: { include: { department: true }, orderBy: { dueAt: "asc" } } },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getDossierForViewer(actor: UserContext, dossierId: string) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const departmentId = actor.departmentId ?? "__none__";
  const dossier = await prisma.clientDossier.findFirst({
    where: {
      id: dossierId,
      isActive: true,
      ...(isGlobalAdmin(actor) ? {} : {
        OR: [
          { missions: { some: { departmentId } } },
          { tickets: { some: { requesterId: actor.id } } },
          { tickets: { some: { sourceDepartmentId: departmentId } } },
          { tickets: { some: { queue: { departmentId } } } },
        ],
      }),
    },
    include: {
      client: true,
      missions: {
        include: {
          department: true,
          _count: { select: { tickets: true, worklogs: true } },
        },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      tickets: {
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          resolutionDueAt: true,
          requester: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          queue: { select: { id: true, name: true, department: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!dossier) throw new ResourceNotFoundError("Dossier introuvable ou hors de votre périmètre.");
  const worklogSummary = await prisma.worklog.aggregate({
    where: { mission: { dossierId } },
    _sum: { minutes: true },
    _count: { _all: true },
  });
  return { ...dossier, worklogSummary: { minutes: worklogSummary._sum.minutes ?? 0, entries: worklogSummary._count._all } };
}

export async function createClientAccount(actor: UserContext, input: ClientAccountInput) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:manage");
  const parsed = clientAccountSchema.parse(input);
  const client = await prisma.clientAccount.create({ data: { code: parsed.code, name: parsed.name } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "CLIENT_ACCOUNT_CREATED", objectType: "ClientAccount", objectId: client.id, newValue: parsed, reason: "Création d’un référentiel client." });
  return client;
}

export async function createDossier(actor: UserContext, input: DossierInput) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:manage");
  const parsed = dossierSchema.parse(input);
  const dossier = await prisma.clientDossier.create({ data: parsed, include: { client: true } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "DOSSIER_CREATED", objectType: "ClientDossier", objectId: dossier.id, newValue: parsed, reason: "Création d’un dossier client." });
  return dossier;
}

export async function createMission(actor: UserContext, input: MissionInput) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:manage");
  const parsed = missionSchema.parse(input);
  if (!departmentAllowed(actor, parsed.departmentId)) throw new AuthorizationError("Le département de la mission est hors de votre périmètre.");
  const dossier = await prisma.clientDossier.findUnique({ where: { id: parsed.dossierId } });
  if (!dossier) throw new ResourceNotFoundError("Dossier client introuvable.");
  const mission = await prisma.mission.create({ data: { ...parsed, departmentId: parsed.departmentId ?? actor.departmentId ?? null }, include: { dossier: true, department: true } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "MISSION_CREATED", objectType: "Mission", objectId: mission.id, newValue: parsed, reason: "Création d’une mission." });
  return mission;
}

export type MissionListOptions = {
  query?: string;
  status?: string;
  departmentId?: string;
  dossierId?: string;
  take?: number;
};

export async function getMissionPortfolioSummary(actor: UserContext, options: Pick<MissionListOptions, "departmentId"> = {}) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const requestedDepartmentId = options.departmentId?.trim() || undefined;
  if (!isGlobalAdmin(actor) && requestedDepartmentId && requestedDepartmentId !== actor.departmentId) {
    throw new AuthorizationError("Le département demandé est hors de votre périmètre.");
  }
  const departmentId = isGlobalAdmin(actor) ? requestedDepartmentId : actor.departmentId ?? "__none__";
  const where = departmentId ? { departmentId } : {};
  const now = new Date();
  const [total, active, late, budget, logged] = await Promise.all([
    prisma.mission.count({ where }),
    prisma.mission.count({ where: { ...where, status: MissionStatus.ACTIVE } }),
    prisma.mission.count({ where: { ...where, status: { notIn: [MissionStatus.COMPLETED, MissionStatus.ARCHIVED] }, dueAt: { lt: now } } }),
    prisma.mission.aggregate({ where, _sum: { budgetMinutes: true } }),
    prisma.worklog.aggregate({ where: { mission: where }, _sum: { minutes: true } }),
  ]);
  return {
    total,
    active,
    late,
    budgetMinutes: budget._sum.budgetMinutes ?? 0,
    worklogMinutes: logged._sum.minutes ?? 0,
  };
}

export async function listMissionsForViewer(actor: UserContext, options: MissionListOptions = {}) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const requestedDepartmentId = options.departmentId?.trim() || undefined;
  if (!isGlobalAdmin(actor) && requestedDepartmentId && requestedDepartmentId !== actor.departmentId) {
    throw new AuthorizationError("Le département demandé est hors de votre périmètre.");
  }
  const departmentId = isGlobalAdmin(actor) ? requestedDepartmentId : actor.departmentId ?? "__none__";
  const normalizedQuery = options.query?.trim();
  const status = options.status && Object.values(MissionStatus).includes(options.status as MissionStatus)
    ? options.status as MissionStatus
    : undefined;
  const take = typeof options.take === "number" && Number.isFinite(options.take)
    ? Math.min(100, Math.max(1, Math.trunc(options.take)))
    : undefined;
  const missions = await prisma.mission.findMany({
    where: {
      ...(departmentId ? { departmentId } : {}),
      ...(options.dossierId ? { dossierId: options.dossierId } : {}),
      ...(status ? { status } : {}),
      ...(normalizedQuery ? { OR: [
        { code: { contains: normalizedQuery, mode: "insensitive" as const } },
        { name: { contains: normalizedQuery, mode: "insensitive" as const } },
        { dossier: { code: { contains: normalizedQuery, mode: "insensitive" as const } } },
        { dossier: { name: { contains: normalizedQuery, mode: "insensitive" as const } } },
        { dossier: { client: { name: { contains: normalizedQuery, mode: "insensitive" as const } } } },
      ] } : {}),
    },
    include: {
      department: true,
      dossier: { include: { client: true } },
      _count: { select: { tickets: true, worklogs: true } },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { name: "asc" }],
    ...(take ? { take } : {}),
  });
  const missionIds = missions.map((mission) => mission.id);
  const worklogs = missionIds.length ? await prisma.worklog.groupBy({
    by: ["missionId"],
    where: { missionId: { in: missionIds } },
    _sum: { minutes: true },
  }) : [];
  const minutesByMission = new Map(worklogs.map((row) => [row.missionId, row._sum.minutes ?? 0]));
  return missions.map((mission) => ({ ...mission, worklogMinutes: minutesByMission.get(mission.id) ?? 0 }));
}

export async function getMissionForViewer(actor: UserContext, missionId: string) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { dossier: { include: { client: true } }, department: true },
  });
  if (!mission || (!isGlobalAdmin(actor) && mission.departmentId !== actor.departmentId)) {
    throw new ResourceNotFoundError("Mission introuvable ou hors de votre périmètre.");
  }

  const ticketVisibility = await visibleTicketWhere(actor);
  const [tickets, worklogs] = await Promise.all([
    prisma.ticket.findMany({
      where: { AND: [ticketVisibility, { missionId }] },
      select: {
        id: true,
        reference: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.worklog.findMany({
      where: { missionId },
      include: {
        user: { select: { id: true, name: true } },
        ticket: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
  ]);
  const worklogMinutes = worklogs.reduce((total, worklog) => total + worklog.minutes, 0);
  return { ...mission, tickets, worklogs, worklogMinutes };
}

export async function getClientForViewer(actor: UserContext, clientId: string) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const client = await prisma.clientAccount.findUnique({ where: { id: clientId } });
  if (!client || !client.isActive) throw new ResourceNotFoundError("Client introuvable.");

  const dossiers = await prisma.clientDossier.findMany({
    where: {
      clientId,
      isActive: true,
      ...(isGlobalAdmin(actor) ? {} : {
        missions: { some: { departmentId: actor.departmentId ?? "__none__" } },
      }),
    },
    include: {
      client: true,
      missions: { include: { department: true }, orderBy: { dueAt: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  if (!isGlobalAdmin(actor) && !dossiers.length) {
    throw new ResourceNotFoundError("Client introuvable ou hors de votre périmètre.");
  }
  const ticketVisibility = await visibleTicketWhere(actor);
  const tickets = await prisma.ticket.findMany({
    where: { AND: [ticketVisibility, { dossier: { clientId } }] },
    select: {
      id: true,
      reference: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      dossier: { select: { id: true, code: true, name: true } },
      mission: { select: { id: true, code: true, name: true } },
      queue: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const missionIds = dossiers.flatMap((dossier) => dossier.missions.map((mission) => mission.id));
  const worklogSummary = missionIds.length ? await prisma.worklog.aggregate({
    where: { missionId: { in: missionIds } },
    _sum: { minutes: true },
    _count: { _all: true },
  }) : { _sum: { minutes: 0 }, _count: { _all: 0 } };
  return {
    client,
    dossiers,
    tickets,
    worklogSummary: {
      minutes: worklogSummary._sum.minutes ?? 0,
      entries: worklogSummary._count._all,
    },
  };
}

export async function getAssetForViewer(actor: UserContext, assetId: string) {
  actor = await requireCurrentActor(actor);
  assertFunctionalAssetAdministrator(actor);
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      department: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      movements: {
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
          fromDepartment: { select: { id: true, name: true } },
          toDepartment: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { movedAt: "desc" },
        take: 100,
      },
      tickets: {
        select: { id: true, reference: true, title: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!asset || (!isGlobalAdmin(actor) && asset.departmentId !== actor.departmentId)) {
    throw new ResourceNotFoundError("Actif introuvable ou hors de votre périmètre.");
  }
  return asset;
}

export async function listAssetMoveTargets(actor: UserContext) {
  actor = await requireCurrentActor(actor);
  assertFunctionalAssetAdministrator(actor);
  const departmentId = actor.departmentId ?? "__none__";
  const departmentWhere = isGlobalAdmin(actor) ? { isActive: true } : { id: departmentId, isActive: true };
  const userWhere = isGlobalAdmin(actor)
    ? { status: "ACTIVE" as const }
    : { status: "ACTIVE" as const, departmentId };
  const [departments, users] = await Promise.all([
    prisma.department.findMany({ where: departmentWhere, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: userWhere, select: { id: true, name: true, email: true, departmentId: true }, orderBy: { name: "asc" } }),
  ]);
  return { departments, users };
}

export async function listAssetsForViewer(actor: UserContext, query?: string) {
  actor = await requireCurrentActor(actor);
  assertFunctionalAssetAdministrator(actor);
  const normalizedQuery = query?.trim();
  return prisma.asset.findMany({
    where: {
      ...(isGlobalAdmin(actor) ? {} : { departmentId: actor.departmentId ?? "__none__" }),
      ...(normalizedQuery ? { OR: [
        { assetTag: { contains: normalizedQuery, mode: "insensitive" as const } },
        { name: { contains: normalizedQuery, mode: "insensitive" as const } },
        { serialNumber: { contains: normalizedQuery, mode: "insensitive" as const } },
      ] } : {}),
    },
    include: { department: true, assignedTo: { select: { id: true, name: true, email: true } } },
    orderBy: { assetTag: "asc" },
  });
}

export async function createAsset(actor: UserContext, input: AssetInput) {
  actor = await requireCurrentActor(actor);
  assertFunctionalAssetAdministrator(actor);
  const parsed = assetSchema.parse(input);
  if (!departmentAllowed(actor, parsed.departmentId)) throw new AuthorizationError("Le département de l’actif est hors de votre périmètre.");
  const asset = await prisma.asset.create({ data: { ...parsed, status: AssetStatus.ACTIVE }, include: { department: true, assignedTo: { select: { id: true, name: true } } } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "ASSET_CREATED", objectType: "Asset", objectId: asset.id, newValue: parsed, reason: "Création d’un actif." });
  return asset;
}

export async function moveAsset(actor: UserContext, assetId: string, input: AssetMovementInput) {
  actor = await requireCurrentActor(actor);
  assertFunctionalAssetAdministrator(actor);
  const parsed = assetMovementSchema.parse(input);
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new ResourceNotFoundError("Actif introuvable.");
  if (!departmentAllowed(actor, asset.departmentId)) throw new AuthorizationError("L’actif est hors de votre périmètre.");
  const [targetUser, targetDepartment] = await Promise.all([
    parsed.toUserId ? prisma.user.findUnique({ where: { id: parsed.toUserId }, select: { id: true, departmentId: true } }) : null,
    parsed.toDepartmentId ? prisma.department.findUnique({ where: { id: parsed.toDepartmentId }, select: { id: true, isActive: true } }) : null,
  ]);
  if (parsed.toUserId && !targetUser) throw new ResourceNotFoundError("Utilisateur cible introuvable.");
  if (parsed.toDepartmentId && (!targetDepartment || !targetDepartment.isActive)) throw new ResourceNotFoundError("Département cible introuvable ou inactif.");
  const departmentId = parsed.toDepartmentId ?? targetUser?.departmentId ?? asset.departmentId;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.asset.update({ where: { id: assetId }, data: { assignedToId: parsed.toUserId ?? null, departmentId } });
    return tx.assetMovement.create({ data: { assetId, fromUserId: asset.assignedToId, toUserId: parsed.toUserId ?? null, fromDepartmentId: asset.departmentId, toDepartmentId: departmentId, reason: parsed.reason, createdById: actor.id } });
  });
  await appendAuditLog(prisma, { actorId: actor.id, action: "ASSET_MOVED", objectType: "Asset", objectId: assetId, oldValue: { assignedToId: asset.assignedToId, departmentId: asset.departmentId }, newValue: { assignedToId: parsed.toUserId ?? null, departmentId }, reason: parsed.reason });
  return updated;
}

export async function addWorklog(actor: UserContext, input: WorklogInput) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "worklog:create");
  const parsed = worklogSchema.parse(input);
  const access = await requireTicketAccess(parsed.ticketId);
  if (access.actor.id !== actor.id) throw new AuthorizationError("Le contexte utilisateur est obsolète.");
  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.ticketId }, select: { id: true, missionId: true, assignedToId: true, queueId: true, queue: { select: { departmentId: true } } } });
  if (!ticket) throw new ResourceNotFoundError("Ticket introuvable.");
  if (parsed.missionId && ticket.missionId && parsed.missionId !== ticket.missionId) throw new AuthorizationError("La mission ne correspond pas à celle du ticket.");
  const isFunctionalAdministrator = isGlobalAdmin(actor);
  const isAssignedAgent = ticket.assignedToId === actor.id;
  const canManageTicketQueue = canManageQueue(toAccessSubject(actor), {
    requesterId: actor.id,
    assignedToId: ticket.assignedToId,
    queueId: ticket.queueId,
    departmentId: ticket.queue.departmentId,
    confidential: false,
  });
  if (!isFunctionalAdministrator && !isAssignedAgent && !canManageTicketQueue) {
    throw new AuthorizationError("Un worklog ne peut être imputé que par l’agent affecté ou le responsable autorisé de la file.");
  }
  const worklog = await prisma.worklog.create({ data: { ticketId: parsed.ticketId, missionId: parsed.missionId ?? ticket.missionId, userId: actor.id, minutes: parsed.minutes, note: parsed.note, startedAt: parsed.startedAt ?? new Date() } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "WORKLOG_CREATED", objectType: "Worklog", objectId: worklog.id, newValue: { ticketId: parsed.ticketId, missionId: worklog.missionId, minutes: parsed.minutes }, reason: parsed.note });
  return worklog;
}

export async function listMissionWorklogs(actor: UserContext, missionId: string) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:read");
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, select: { id: true, departmentId: true } });
  if (!mission) throw new ResourceNotFoundError("Mission introuvable.");
  if (!departmentAllowed(actor, mission.departmentId)) throw new AuthorizationError("La mission est hors de votre périmètre.");
  return prisma.worklog.findMany({ where: { missionId }, include: { user: { select: { id: true, name: true } }, ticket: { select: { id: true, reference: true, title: true } } }, orderBy: { startedAt: "desc" } });
}

export async function completeMission(actor: UserContext, missionId: string) {
  actor = await requireCurrentActor(actor);
  ensurePermission(actor, "portfolio:manage");
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, select: { id: true, departmentId: true, status: true } });
  if (!mission) throw new ResourceNotFoundError("Mission introuvable.");
  if (!departmentAllowed(actor, mission.departmentId)) throw new AuthorizationError("La mission est hors de votre périmètre.");
  const updated = await prisma.mission.update({ where: { id: missionId }, data: { status: MissionStatus.COMPLETED } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "MISSION_COMPLETED", objectType: "Mission", objectId: missionId, oldValue: { status: mission.status }, newValue: { status: updated.status }, reason: "Clôture de la mission." });
  return updated;
}
