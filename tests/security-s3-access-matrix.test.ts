import { describe, expect, it } from "vitest";
import { RoleCode, ScopeType } from "@prisma/client";
import { canReadReporting, canViewTicket, delegationAllowsAction, type AccessSubject, type TicketAccessTarget } from "@/lib/access-control";

const ticket: TicketAccessTarget = {
  requesterId: "requester",
  assignedToId: "assigned-agent",
  queueId: "queue-a",
  departmentId: "dept-a",
  confidential: false,
  teamIds: ["team-a"],
  authorizedUserIds: [],
};

function subject(id: string, code: RoleCode, extras: Partial<AccessSubject> = {}): AccessSubject {
  return {
    id,
    departmentId: "dept-a",
    roles: [{ code, scope: { type: ScopeType.QUEUE, queueId: "queue-a" } }],
    ...extras,
  };
}

describe("S3 — matrice d'accès réelle multi-rôles et confidentialité", () => {
  it("laisse chaque demandeur consulter son ticket, sans ouvrir ceux des autres", () => {
    const requester = subject("requester", RoleCode.REQUESTER);
    const outsider = subject("other", RoleCode.REQUESTER);
    expect(canViewTicket(requester, ticket)).toBe(true);
    expect(canViewTicket(outsider, ticket)).toBe(false);
  });

  it("n'autorise un agent que dans les équipes actives de la file", () => {
    expect(canViewTicket(subject("agent", RoleCode.AGENT, { teamIds: ["team-a"] }), ticket)).toBe(true);
    expect(canViewTicket(subject("agent", RoleCode.AGENT, { teamIds: [] }), ticket)).toBe(false);
    expect(canViewTicket(subject("agent", RoleCode.AGENT, {
      teamIds: ["team-other"],
      roles: [{ code: RoleCode.AGENT, scope: { type: ScopeType.QUEUE, queueId: "queue-other" } }],
    }), ticket)).toBe(false);
  });

  it("laisse un responsable gérer sa file, pas une file indépendante", () => {
    expect(canViewTicket(subject("manager", RoleCode.QUEUE_MANAGER), ticket)).toBe(true);
    expect(canViewTicket(subject("manager", RoleCode.QUEUE_MANAGER, { authorizedQueueId: "queue-other" }), ticket)).toBe(false);
  });

  it("ne donne pas à l'administrateur technique ni au lecteur reporting l'accès au détail des tickets", () => {
    expect(canViewTicket(subject("tech", RoleCode.TECHNICAL_ADMIN), ticket)).toBe(false);
    expect(canViewTicket(subject("reporter", RoleCode.REPORTING_READER), ticket)).toBe(false);
    expect(canReadReporting(subject("reporter", RoleCode.REPORTING_READER), ticket)).toBe(true);
  });

  it("conserve les rôles cumulés fonctionnels + responsable file sans bypass confidentiel", () => {
    const both: AccessSubject = {
      id: "dual-role",
      departmentId: "dept-a",
      managedQueueIds: ["queue-a"],
      roles: [
        { code: RoleCode.FUNCTIONAL_ADMIN, scope: { type: ScopeType.GLOBAL } },
        { code: RoleCode.QUEUE_MANAGER, scope: { type: ScopeType.QUEUE, queueId: "queue-a" } },
      ],
    };
    expect(canViewTicket(both, ticket)).toBe(true);
    expect(canViewTicket(both, { ...ticket, confidential: true })).toBe(false);
    expect(canViewTicket(both, {
      ...ticket,
      confidential: true,
      authorizedUserIds: ["dual-role"],
    })).toBe(true);
  });

  it("exige une autorisation nominative même pour l'agent affecté à un confidentiel", () => {
    const assigned = subject("assigned-agent", RoleCode.AGENT, { teamIds: ["team-a"] });
    expect(canViewTicket(assigned, ticket)).toBe(true);
    expect(canViewTicket(assigned, { ...ticket, confidential: true })).toBe(false);
    expect(canViewTicket(assigned, { ...ticket, confidential: true, authorizedUserIds: ["assigned-agent"] })).toBe(true);
  });

  it("limite les actions d'une délégation sans étendre ses permissions", () => {
    const target = {
      ...ticket,
      confidential: true,
      authorizedUserIds: ["substitute"],
      delegatedActionsByUser: { substitute: ["VIEW", "COMMENT"] },
    };
    expect(canViewTicket(subject("substitute", RoleCode.AGENT, { teamIds: [] }), target)).toBe(true);
    expect(delegationAllowsAction("substitute", target, "COMMENT")).toBe(true);
    expect(delegationAllowsAction("substitute", target, "ASSIGN")).toBe(false);
    expect(canReadReporting(subject("substitute", RoleCode.REPORTING_READER), target)).toBe(false);
  });
});
