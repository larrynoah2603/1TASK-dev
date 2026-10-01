export const ticketSecurityInclude = {
  requester: { select: { id: true, name: true } },
  sourceDepartment: { select: { id: true, name: true, code: true } },
  assignedTo: { select: { id: true, name: true } },
  queue: {
    select: {
      id: true,
      name: true,
      code: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
    },
  },
  serviceCatalogItem: { select: { id: true, name: true, code: true, category: true } },
  dossier: { select: { id: true, code: true, name: true, client: { select: { id: true, code: true, name: true } } } },
  mission: { select: { id: true, code: true, name: true, status: true, dueAt: true, budgetMinutes: true } },
} as const;

export const ticketAccessInclude = {
  assignedTo: {
    select: {
      id: true,
      teamMemberships: {
        select: {
          teamId: true,
          isActive: true,
          team: {
            select: {
              isActive: true,
            },
          },
        },
      },
    },
  },

  queue: {
    select: {
      id: true,
      isActive: true,
      managerId: true,
      departmentId: true,

      department: {
        select: {
          id: true,
          isActive: true,
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

  accessList: {
    select: {
      userId: true,
      delegationId: true,
      delegation: { select: { startsAt: true, endsAt: true, revokedAt: true, substituteId: true, actions: true } },
    },
  },

  serviceCatalogItem: {
    select: {
      id: true,
      code: true,
      category: true,
    },
  },
} as const;

export type AccessTicket = {
  id?: string;
  requesterId: string;
  assignedToId: string | null;
  assignedTo?: unknown;
  queueId: string;
  confidential: boolean;
  category?: string;
  queue: {
    departmentId: string;
    teams?: { id: string; isActive: boolean }[];
  };
  accessList?: { userId: string; delegationId?: string | null; delegation?: { startsAt: Date; endsAt: Date | null; revokedAt: Date | null; substituteId: string; actions: string[] } | null }[];
  serviceCatalogItem?: { code?: string | null; category?: string | null } | null;
};

export function accessTarget(ticket: AccessTicket) {
  const now = new Date();
  const assignedTo = ticket.assignedTo as {
    teamMemberships?: { teamId: string; isActive: boolean; team: { isActive: boolean } }[];
  } | null | undefined;
  return {
    requesterId: ticket.requesterId,
    assignedToId: ticket.assignedToId,
    queueId: ticket.queueId,
    departmentId: ticket.queue.departmentId,
    confidential: ticket.confidential,
    assignedToTeamIds: assignedTo?.teamMemberships
      ?.filter((membership) => membership.isActive && membership.team.isActive)
      .map((membership) => membership.teamId),
    authorizedUserIds: ticket.accessList?.filter((entry) => !entry.delegation || (entry.delegation.substituteId === entry.userId && !entry.delegation.revokedAt && entry.delegation.startsAt <= now && (!entry.delegation.endsAt || entry.delegation.endsAt > now))).map((entry) => entry.userId) ?? [],
    delegatedActionsByUser: Object.fromEntries((ticket.accessList ?? []).filter((entry) => entry.delegation && entry.delegation.substituteId === entry.userId && !entry.delegation.revokedAt && entry.delegation.startsAt <= now && (!entry.delegation.endsAt || entry.delegation.endsAt > now)).map((entry) => [entry.userId, entry.delegation?.actions ?? []])),
    teamIds: ticket.queue.teams?.filter((team) => team.isActive).map((team) => team.id),
    portfolioKeys: [
      ticket.category,
      ticket.serviceCatalogItem?.code,
      ticket.serviceCatalogItem?.category,
    ].filter((value): value is string => Boolean(value)),
  };
}
