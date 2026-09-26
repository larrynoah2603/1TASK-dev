import { cache } from "react";
import { Priority, Prisma, RoleCode, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/domain-error";
import { readServerEnvironment } from "@/lib/env";
import { logTelemetry } from "@/lib/observability";
import { measureServerOperation } from "@/lib/performance";
import { requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { getTicketSlaState, SLA_RISK_WINDOW_MINUTES } from "@/lib/sla";
import { toTicketListItemDomain } from "@/lib/mappers/ticket.mapper";

type VisibilityOptions = {
  workQueue?: boolean;
  /** Reporting uses the same server-side scope predicates but never returns
   * ticket rows or personal/confidential records. */
  mode?: "TICKETS" | "REPORTING";
};

export type TicketListScope = "all" | "unassigned" | "mine" | "team" | "requested";
export type TicketListSlaFilter = "attention" | "breached";
export type TicketListSort = "updated_desc" | "created_desc" | "created_asc" | "status_asc";

export type TicketListOptions = VisibilityOptions & {
  status?: TicketStatus;
  priority?: Priority;
  scope?: TicketListScope;
  sla?: TicketListSlaFilter;
  departmentId?: string;
  queueId?: string;
  dossierId?: string;
  missionId?: string;
  query?: string;
  cursor?: string;
  take?: number;
  page?: number;
  pageSize?: number;
  sort?: TicketListSort;
};

async function measureTicketQueryTiming<T>(
  category: "ticket-access" | "tickets.list",
  operation: string,
  callback: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    return await callback();
  } finally {
    logTelemetry("info", `[PERF][${category}]`, {
      operation,
      durationMs: Date.now() - startedAt,
    });
  }
}

function nonConfidential(clause: Prisma.TicketWhereInput): Prisma.TicketWhereInput {
  return { ...clause, confidential: false };
}

const loadActiveTeamMemberRows = cache(async (teamIdsKey: string) => {
  const teamIds = teamIdsKey.split("|").filter(Boolean);
  if (!teamIds.length) return [];
  return measureTicketQueryTiming("ticket-access", "loadActiveTeamMemberRows", () =>
    prisma.teamMember.findMany({
      where: {
        teamId: { in: teamIds },
        isActive: true,
        team: { isActive: true },
        user: { status: "ACTIVE" },
      },
      select: { teamId: true, userId: true },
    }),
  );
});

const MAX_FULL_TEXT_SEARCH_CANDIDATES = 5_000;

async function ticketSearchCandidateIds(query: string): Promise<string[] | null> {
  if (!readServerEnvironment().TICKET_FTS_ENABLED) return null;
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id"
    FROM "Ticket"
    WHERE "reference" = ${normalizedQuery}
       OR search_vector @@ plainto_tsquery(
         'french',
         public.immutable_unaccent(${normalizedQuery})
       )
    ORDER BY
      CASE WHEN "reference" = ${normalizedQuery} THEN 0 ELSE 1 END,
      ts_rank(
        search_vector,
        plainto_tsquery('french', public.immutable_unaccent(${normalizedQuery}))
      ) DESC,
      "updatedAt" DESC,
      "id" DESC
    LIMIT ${MAX_FULL_TEXT_SEARCH_CANDIDATES}
  `);
  return rows.map((row) => row.id);
}


export const cachedVisibleTicketWhere = cache(
  async (
    actorId: string,
    actor: UserContext,
    optionsKey: string,
  ): Promise<Prisma.TicketWhereInput> => {

    const options =
      JSON.parse(optionsKey) as VisibilityOptions;

    return visibleTicketWhereInternal(
      actor,
      options,
    );
  },
);


export async function visibleTicketWhere(
  actor: UserContext,
  options: VisibilityOptions = {},
): Promise<Prisma.TicketWhereInput> {

  return cachedVisibleTicketWhere(
    actor.id,
    actor,
    JSON.stringify(options),
  );

}

async function visibleTicketWhereInternal(
  actor: UserContext,
  options: VisibilityOptions = {},
): Promise<Prisma.TicketWhereInput> {
  return measureTicketQueryTiming("ticket-access", "visibleTicketWhere", () =>
    calculateVisibleTicketWhere(actor, options),
  );
}

async function calculateVisibleTicketWhere(
  actor: UserContext,
  options: VisibilityOptions,
): Promise<Prisma.TicketWhereInput> {
  const scopedClauses: Prisma.TicketWhereInput[] = [];
  const reportingMode = options.mode === "REPORTING";
  const relevantRoles = reportingMode
    ? new Set<RoleCode>([
        RoleCode.REPORTING_READER,
        RoleCode.QUEUE_MANAGER,
        RoleCode.FUNCTIONAL_ADMIN,
      ])
    : new Set<RoleCode>([
        RoleCode.AGENT,
        RoleCode.QUEUE_MANAGER,
        RoleCode.FUNCTIONAL_ADMIN,
      ]);
  const activeTeamMemberships = actor.teamMemberships.filter(
    (membership) => membership.isActive && membership.team.isActive,
  );
  const activeTeamQueueIds = [...new Set(activeTeamMemberships.map((membership) => membership.team.queueId))]
    .filter((queueId) => !actor.authorizedQueueId || actor.authorizedQueueId === queueId);
  const teamIdsKey = activeTeamMemberships
    .map((membership) => membership.team.id)
    .sort()
    .join("|");
  const activeTeamMemberRows = await loadActiveTeamMemberRows(teamIdsKey);
  const agentBoundaryForTeams = (
    teams: UserContext["teamMemberships"],
  ): Prisma.TicketWhereInput => {
    const teamIds = teams.map((membership) => membership.team.id);
    const queueIds = [...new Set(teams.map((membership) => membership.team.queueId))]
      .filter((queueId) => !actor.authorizedQueueId || actor.authorizedQueueId === queueId);
    const memberIds = [...new Set(
      activeTeamMemberRows
        .filter((member) => teamIds.includes(member.teamId))
        .map((member) => member.userId),
    )];
    const clauses: Prisma.TicketWhereInput[] = [];
    if (memberIds.length && queueIds.length) {
      clauses.push({ AND: [{ assignedToId: { in: memberIds } }, { queueId: { in: queueIds } }] });
    }
    if (queueIds.length) clauses.push({ AND: [{ queueId: { in: queueIds } }, { assignedToId: null }] });
    return { OR: clauses.length ? clauses : [{ id: "__no_agent_team_boundary__" }] };
  };

  for (const assignment of actor.roleAssignments) {
    if (!relevantRoles.has(assignment.role.code)) continue;
    const scope = assignment.scope;

    if (assignment.role.code === RoleCode.AGENT) {
      // Agents can work only in queues reached through an active team
      // membership. A role scope can narrow that perimeter but never widen it.
      if (!activeTeamQueueIds.length) continue;
      const agentQueueBoundary = agentBoundaryForTeams(activeTeamMemberships);
      if (!scope || scope.type === "GLOBAL") {
        scopedClauses.push(nonConfidential(agentQueueBoundary));
        continue;
      }
      switch (scope.type) {
        case "DEPARTMENT":
          if (scope.departmentId) {
            scopedClauses.push(nonConfidential({
              AND: [agentQueueBoundary, { queue: { departmentId: scope.departmentId } }],
            }));
          }
          break;
        case "QUEUE":
          if (scope.queueId && activeTeamQueueIds.includes(scope.queueId)) {
            const teams = activeTeamMemberships.filter((membership) => membership.team.queueId === scope.queueId);
            scopedClauses.push(nonConfidential(agentBoundaryForTeams(teams)));
          }
          break;
        case "TEAM": {
          const membership = activeTeamMemberships.find((item) => item.team.id === scope.teamId);
          if (membership) scopedClauses.push(nonConfidential(agentBoundaryForTeams([membership])));
          break;
        }
        case "PORTFOLIO":
          if (scope.portfolioKey) {
            scopedClauses.push(nonConfidential({
              AND: [
                agentQueueBoundary,
                { OR: [{ category: scope.portfolioKey }, { serviceCatalogItem: { code: scope.portfolioKey } }] },
              ],
            }));
          }
          break;
        case "USER_LIST":
          if (scope.members.length) {
            const userIds = scope.members.map((member) => member.userId);
            scopedClauses.push(nonConfidential({
              AND: [
                agentQueueBoundary,
                { OR: [{ requesterId: { in: userIds } }, { assignedToId: { in: userIds } }] },
              ],
            }));
          }
          break;
        default:
          break;
      }
      continue;
    }

    if (!scope || scope.type === "GLOBAL") {
      scopedClauses.push({ confidential: false });
      continue;
    }

    switch (scope.type) {
      case "DEPARTMENT":
        if (scope.departmentId) {
          scopedClauses.push(nonConfidential({ queue: { departmentId: scope.departmentId } }));
        }
        break;
      case "QUEUE":
        if (scope.queueId) scopedClauses.push(nonConfidential({ queueId: scope.queueId }));
        break;
      case "TEAM": {
        if (scope.teamId) {
          scopedClauses.push(
            nonConfidential({
              queue: { teams: { some: { id: scope.teamId, isActive: true } } },
            }),
          );
        }
        break;
      }
      case "PORTFOLIO":
        if (scope.portfolioKey) {
          scopedClauses.push(
            nonConfidential({
              OR: [
                { category: scope.portfolioKey },
                { serviceCatalogItem: { code: scope.portfolioKey } },
              ],
            }),
          );
        }
        break;
      case "USER_LIST":
        if (scope.members.length) {
          const userIds = scope.members.map((member) => member.userId);
          scopedClauses.push(
            nonConfidential({
              OR: [
                { requesterId: { in: userIds } },
                { assignedToId: { in: userIds } },
              ],
            }),
          );
        }
        break;
      default:
        break;
    }
  }

  // A queue manager explicitly attached to a queue can supervise that queue
  // even when no separate scoped role assignment was created. Reporting and
  // technical roles are deliberately excluded from this operational clause.
  const operationalQueueIds = new Set<string>(actor.managedQueues.map((queue) => queue.id));
  if (operationalQueueIds.size) {
    scopedClauses.push(
      nonConfidential({ queueId: { in: [...operationalQueueIds] } }),
    );
  }

  const personalClauses: Prisma.TicketWhereInput[] = reportingMode
    ? []
    : [
        { assignedToId: actor.id },
        { accessList: { some: { userId: actor.id } } },
      ];
  if (!reportingMode && !options.workQueue) personalClauses.unshift({ requesterId: actor.id });
  const authorizedQueueId = actor.authorizedQueueId;
  const authorizedScopedClauses = authorizedQueueId
    ? scopedClauses.map((clause) => ({
        AND: [clause, { queueId: authorizedQueueId }],
      }))
    : scopedClauses;
  if (!personalClauses.length && !authorizedScopedClauses.length) {
    return { id: "__no_visible_ticket_scope__" };
  }
  return { OR: [...personalClauses, ...authorizedScopedClauses] };
}

async function buildTicketListWhere(actor: UserContext, options: TicketListOptions) {
  return measureTicketQueryTiming("tickets.list", "buildTicketListWhere", () =>
    calculateTicketListWhere(actor, options),
  );
}

async function calculateTicketListWhere(actor: UserContext, options: TicketListOptions) {
  const current = await requireCurrentActor(actor);
  const filters: Prisma.TicketWhereInput[] = [];
  if (options.status) filters.push({ status: options.status });
  if (options.priority) filters.push({ priority: options.priority });
  if (options.departmentId) filters.push({ queue: { departmentId: options.departmentId } });
  if (options.queueId) filters.push({ queueId: options.queueId });
  if (options.dossierId) filters.push({ dossierId: options.dossierId });
  if (options.missionId) filters.push({ missionId: options.missionId });

  switch (options.scope) {
    case "unassigned":
      filters.push({ assignedToId: null });
      break;
    case "mine":
      filters.push({ assignedToId: current.id });
      break;
    case "requested":
      filters.push({ requesterId: current.id });
      break;
    case "team": {
      const teamIds = current.teamMemberships
        .filter((membership) => membership.isActive && membership.team.isActive)
        .map((membership) => membership.team.id);
      if (!teamIds.length) {
        filters.push({ id: "__no_active_team_membership__" });
        break;
      }
      const teamIdsKey = [...teamIds].sort().join("|");
      const teamMembers = await loadActiveTeamMemberRows(teamIdsKey);
      const userIds = [...new Set(
        teamMembers
          .filter((member) => teamIds.includes(member.teamId))
          .map((member) => member.userId),
      )];
      filters.push(userIds.length ? { assignedToId: { in: userIds } } : { id: "__no_active_team_members__" });
      break;
    }
    default:
      break;
  }

  const now = new Date();
  if (options.sla) {
    const deadline = options.sla === "breached"
      ? now
      : new Date(now.getTime() + SLA_RISK_WINDOW_MINUTES * 60_000);
    filters.push({
      status: { notIn: [TicketStatus.CLOSED, TicketStatus.BLOCKED] },
      slaPausedAt: null,
      OR: [
        {
          firstResponseDueAt: { not: null, ...(options.sla === "breached" ? { lt: deadline } : { lte: deadline }) },
          firstRespondedAt: null,
        },
        {
          resolutionDueAt: { not: null, ...(options.sla === "breached" ? { lt: deadline } : { lte: deadline }) },
          resolvedAt: null,
          status: { not: TicketStatus.RESOLUTION_PENDING },
        },
      ],
    });
  }
  if (options.query) {
    const candidateIds = await ticketSearchCandidateIds(options.query);
    filters.push(candidateIds === null
      ? {
          OR: [
            { reference: { contains: options.query, mode: "insensitive" } },
            { title: { contains: options.query, mode: "insensitive" } },
            { description: { contains: options.query, mode: "insensitive" } },
          ],
        }
      : { id: { in: candidateIds.length ? candidateIds : ["__no_full_text_match__"] } });
  }
  const baseWhere = await visibleTicketWhere(current, options);
  const where: Prisma.TicketWhereInput = filters.length
    ? { AND: [baseWhere, ...filters] }
    : baseWhere;
  return { actor: current, where };
}

function ticketOrderBy(sort: TicketListSort = "updated_desc"): Prisma.TicketOrderByWithRelationInput[] {
  switch (sort) {
    case "created_desc":
      return [{ createdAt: "desc" }, { id: "desc" }];
    case "created_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }, { id: "desc" }];
    default:
      return [{ updatedAt: "desc" }, { id: "desc" }];
  }
}

type TicketListCursor = {
  id: string;
  sort: TicketListSort;
  updatedAt?: string;
  createdAt?: string;
  status?: TicketStatus;
};

function encodeTicketListCursor(cursor: TicketListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeTicketListCursor(value: string, sort: TicketListSort): TicketListCursor {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<TicketListCursor>;
    if (typeof decoded.id !== "string" || !decoded.id || decoded.sort !== sort) throw new Error("invalid cursor");
    if ((sort === "updated_desc" || sort === "status_asc") && !decoded.updatedAt) throw new Error("missing updatedAt");
    if ((sort === "created_desc" || sort === "created_asc") && !decoded.createdAt) throw new Error("missing createdAt");
    if (sort === "status_asc" && !decoded.status) throw new Error("missing status");
    return decoded as TicketListCursor;
  } catch {
    throw new DomainError("Le curseur de pagination est invalide pour ce tri.", 400);
  }
}

function ticketCursorBoundary(cursor: TicketListCursor): Prisma.TicketWhereInput {
  if (cursor.sort === "created_desc") {
    const createdAt = new Date(cursor.createdAt!);
    return { OR: [
      { createdAt: { lt: createdAt } },
      { AND: [{ createdAt }, { id: { lt: cursor.id } }] },
    ] };
  }
  if (cursor.sort === "created_asc") {
    const createdAt = new Date(cursor.createdAt!);
    return { OR: [
      { createdAt: { gt: createdAt } },
      { AND: [{ createdAt }, { id: { gt: cursor.id } }] },
    ] };
  }
  if (cursor.sort === "status_asc") {
    const updatedAt = new Date(cursor.updatedAt!);
    const statuses = Object.values(TicketStatus);
    const index = statuses.indexOf(cursor.status!);
    const followingStatuses = index >= 0 ? statuses.slice(index + 1) : [];
    return { OR: [
      ...(followingStatuses.length ? [{ status: { in: followingStatuses } }] : []),
      {
        AND: [
          { status: cursor.status },
          { OR: [
            { updatedAt: { lt: updatedAt } },
            { AND: [{ updatedAt }, { id: { lt: cursor.id } }] },
          ] },
        ],
      },
    ] };
  }
  const updatedAt = new Date(cursor.updatedAt!);
  return { OR: [
    { updatedAt: { lt: updatedAt } },
    { AND: [{ updatedAt }, { id: { lt: cursor.id } }] },
  ] };
}

function ticketCursorFromRow(
  ticket: { id: string; updatedAt: Date; createdAt: Date; status: TicketStatus },
  sort: TicketListSort,
): TicketListCursor {
  if (sort === "created_desc" || sort === "created_asc") {
    return { id: ticket.id, sort, createdAt: ticket.createdAt.toISOString() };
  }
  if (sort === "status_asc") {
    return { id: ticket.id, sort, status: ticket.status, updatedAt: ticket.updatedAt.toISOString() };
  }
  return { id: ticket.id, sort, updatedAt: ticket.updatedAt.toISOString() };
}

const ticketListSelect = {
  id: true,
  reference: true,
  title: true,
  status: true,
  priority: true,
  requesterId: true,
  assignedToId: true,
  queueId: true,
  confidential: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  firstResponseDueAt: true,
  firstRespondedAt: true,
  resolutionDueAt: true,
  resolvedAt: true,
  slaPausedAt: true,
  totalPausedMinutes: true,
 queue: {
  select: {
    id: true,
    name: true,
    departmentId: true,

    department: {
      select: {
        id: true,
        name: true,
      },
    },

    manager: {
      select: {
        id: true,
        name: true,
      },
    },

    teams: {
      select: {
        id: true,
        isActive: true,
      },
    },
  },
},
  assignedTo: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true } },
  sourceDepartment: { select: { id: true, name: true, code: true } },
  serviceCatalogItem: { select: { name: true, code: true, category: true } },
} satisfies Prisma.TicketSelect;

export function listVisibleTicketsPage(
  actor: UserContext,
  options: TicketListOptions = {},
  settings: { includeTotal?: boolean } = {},
) {
  return measureServerOperation("tickets.list",
    () => listVisibleTicketsPageInternal(actor, options, settings.includeTotal ?? false),
  );
}

async function listVisibleTicketsPageInternal(
  actor: UserContext,
  options: TicketListOptions = {},
  includeTotal = true,
) {
  const { where } = await buildTicketListWhere(actor, options);
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? options.take ?? 25, 1), 100);
  const sort = options.sort ?? "updated_desc";
  const cursor = options.cursor ? decodeTicketListCursor(options.cursor, sort) : null;
  const now = new Date();
  const cursorWhere = cursor ? { AND: [where, ticketCursorBoundary(cursor)] } : where;
  const [ticketRows, exactTotal] = await Promise.all([
    measureTicketQueryTiming("tickets.list", "findMany", () =>
      prisma.ticket.findMany({
        where: cursorWhere,
        select: ticketListSelect,
        orderBy: ticketOrderBy(sort),
        ...(!cursor ? { skip: (page - 1) * pageSize } : {}),
        take: cursor || !includeTotal ? pageSize + 1 : pageSize,
      }),
    ),
    includeTotal
      ? measureTicketQueryTiming("tickets.list", "count", () => prisma.ticket.count({ where }))
      : Promise.resolve(null),
  ]);
  const hasMore = cursor || exactTotal === null ? ticketRows.length > pageSize : page * pageSize < exactTotal;
  const tickets = ticketRows.slice(0, pageSize);
  const total = exactTotal ?? tickets.length;
  const mapped = tickets.map((ticket) => {
    const sla = getTicketSlaState(ticket, now);
    return toTicketListItemDomain({ ...ticket, slaState: sla.state, slaDueAt: sla.dueAt });
  });
  return {
    tickets: mapped,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasMore,
    nextCursor: hasMore && tickets.length
      ? encodeTicketListCursor(ticketCursorFromRow(tickets.at(-1)!, sort))
      : null,
  };
}

export async function listVisibleTickets(actor: UserContext, options: TicketListOptions = {}) {
  return (await measureServerOperation(
    "tickets.list_without_total",
    () => listVisibleTicketsPageInternal(actor, options, false),
  )).tickets;
}

export async function getRequesterTicketSummary(actor: UserContext) {
  const current = await requireCurrentActor(actor);
  const visibleWhere = await visibleTicketWhere(current);
  const grouped = await prisma.ticket.groupBy({
    by: ["status"],
    where: { AND: [visibleWhere, { requesterId: current.id }] },
    _count: { _all: true },
  });
  return Object.fromEntries(
    Object.values(TicketStatus).map((status) => [
      status,
      grouped.find((row) => row.status === status)?._count._all ?? 0,
    ]),
  ) as Record<TicketStatus, number>;
}

export async function getOperationalTicketSummary(actor: UserContext) {
  const { actor: current, where } = await buildTicketListWhere(actor, { workQueue: true });
  const activeWhere: Prisma.TicketWhereInput = { AND: [where, { status: { not: TicketStatus.CLOSED } }] };
  const now = new Date();
  const riskDeadline = new Date(now.getTime() + SLA_RISK_WINDOW_MINUTES * 60_000);
  const slaWhere: Prisma.TicketWhereInput = {
    AND: [
      activeWhere,
      { status: { not: TicketStatus.BLOCKED }, slaPausedAt: null },
      {
        OR: [
          { firstResponseDueAt: { not: null, lte: riskDeadline }, firstRespondedAt: null },
          { resolutionDueAt: { not: null, lte: riskDeadline }, resolvedAt: null, status: { not: TicketStatus.RESOLUTION_PENDING } },
        ],
      },
    ],
  };
  const [statusCounts, assignmentCounts, slaAttention, slaBreached] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: {
        AND: [
          activeWhere,
          { OR: [{ assignedToId: null }, { assignedToId: current.id }] },
        ],
      },
      _count: { _all: true },
    }),
    prisma.ticket.count({ where: slaWhere }),
    prisma.ticket.count({ where: {
      AND: [
        activeWhere,
        { status: { not: TicketStatus.BLOCKED }, slaPausedAt: null },
        { OR: [
          { firstResponseDueAt: { not: null, lt: now }, firstRespondedAt: null },
          { resolutionDueAt: { not: null, lt: now }, resolvedAt: null, status: { not: TicketStatus.RESOLUTION_PENDING } },
        ] },
      ],
    } }),
  ]);
  const total = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const active = statusCounts
    .filter((row) => row.status !== TicketStatus.CLOSED)
    .reduce((sum, row) => sum + row._count._all, 0);
  const unassigned = assignmentCounts.find((row) => row.assignedToId === null)?._count._all ?? 0;
  const mine = assignmentCounts.find((row) => row.assignedToId === current.id)?._count._all ?? 0;
  return { total, active, unassigned, mine, slaAttention, slaBreached };
}



