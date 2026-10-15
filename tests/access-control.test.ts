import { describe, expect, it } from "vitest";
import { RoleCode, ScopeType } from "@prisma/client";
import { canClaimTicket, canReadReporting, canViewTicket } from "@/lib/access-control";
import { accessTarget } from "@/lib/ticket-access";

const target = { requesterId: "requester", assignedToId: "agent", queueId: "queue-network", departmentId: "dsi", confidential: false };

describe("cloisonnement", () => {
  it("ne donne pas aux utilisateurs hors file un accès global implicite", () => {
    expect(canViewTicket({ id: "other", departmentId: "compta", roles: [{ code: RoleCode.AGENT, scope: { type: ScopeType.QUEUE, queueId: "queue-other" } }] }, target)).toBe(false);
  });

  it("ouvre un ticket ordinaire figurant dans la vue autorisée par une concession nominative", () => {
    const granted = { ...target, assignedToId: null, authorizedUserIds: ["invited-user"] };
    const invited = { id: "invited-user", roles: [] };
    expect(canViewTicket(invited, granted)).toBe(true);
    // The named entry is personal: the other authorized operational queue is
    // not itself a role-based grant and must not hide this exact ticket.
    expect(canViewTicket({ ...invited, authorizedQueueId: "queue-other" }, granted)).toBe(true);
    expect(canViewTicket({ id: "other", roles: [] }, granted)).toBe(false);
    expect(canViewTicket(invited, { ...granted, authorizedUserIds: [] })).toBe(false);
    expect(canViewTicket(invited, { ...granted, authorizedUserIds: [], confidential: true })).toBe(false);
  });

  it("préserve la lecture après proposition de résolution puis clôture", () => {
    const viewer = { id: "invited-user", roles: [] };
    const base = { ...target, requesterId: "another-requester", assignedToId: null, authorizedUserIds: ["invited-user"] };
    // Status is not an access boundary; mutations require permissions and
    // must still be denied for a viewer without a relevant role.
    for (const status of ["IN_PROGRESS", "RESOLUTION_PENDING", "CLOSED", "CANCELLED"] as const) {
      expect(canViewTicket(viewer, { ...base, status })).toBe(true);
    }
    expect(canViewTicket({ id: "requester", roles: [] }, { ...base, requesterId: "requester", authorizedUserIds: [] })).toBe(true);
    expect(canViewTicket({ id: "unrelated", roles: [] }, { ...base, authorizedUserIds: [] })).toBe(false);
  });

  it("limite un dossier confidentiel aux personnes nominatives", () => {
    const confidential = { ...target, confidential: true, authorizedUserIds: ["authorized"] };
    expect(canViewTicket({ id: "authorized", roles: [] }, confidential)).toBe(true);
    expect(canViewTicket({ id: "other", roles: [{ code: RoleCode.FUNCTIONAL_ADMIN }] }, confidential)).toBe(false);
  });

  it("honore un accès confidentiel nominatif inter-files sans pouvoir implicite", () => {
    const crossQueue = {
      ...target, confidential: true,
      authorizedUserIds: ["recipient"],
    };
    const invited = { id: "recipient", authorizedQueueId: "queue-other", roles: [{ code: RoleCode.REQUESTER }] };
    expect(canViewTicket(invited, crossQueue)).toBe(true);
    expect(canViewTicket({ ...invited, id: "unrelated" }, crossQueue)).toBe(false);
    expect(canViewTicket({ ...invited, id: "unrelated", roles: [{ code: RoleCode.FUNCTIONAL_ADMIN }] }, crossQueue)).toBe(false);
    expect(canViewTicket(invited, { ...crossQueue, authorizedUserIds: [] })).toBe(false);
  });

  it("ignore les délégations révoquées ou expirées avant l'évaluation de la fiche", () => {
    const now = new Date("2026-10-15T13:00:00Z");
    const makeEntry = (userId: string, endsAt: Date | null, revokedAt: Date | null) => ({
      userId,
      delegationId: "delegation-" + userId,
      delegation: {
        substituteId: userId,
        startsAt: new Date("2026-10-01T00:00:00Z"),
        endsAt,
        revokedAt,
        actions: ["VIEW"],
      },
    });
    const target = accessTarget({
      requesterId: "owner",
      assignedToId: null,
      queueId: "queue-network",
      confidential: true,
      queue: { departmentId: "dsi", teams: [] },
      accessList: [
        { userId: "permanent", delegationId: null },
        makeEntry("active", new Date("2026-10-16T00:00:00Z"), null),
        makeEntry("expired", new Date("2026-10-14T00:00:00Z"), null),
        makeEntry("revoked", null, new Date("2026-10-14T00:00:00Z")),
      ],
    }, now);
    expect(target.authorizedUserIds).toEqual(["permanent", "active"]);
    for (const id of ["permanent", "active"]) {
      expect(canViewTicket({ id, authorizedQueueId: "another-queue", roles: [] }, target)).toBe(true);
    }
    for (const id of ["expired", "revoked", "outsider"]) {
      expect(canViewTicket({ id, roles: [{ code: RoleCode.FUNCTIONAL_ADMIN }] }, target)).toBe(false);
    }
  });

  it("ne transforme jamais une affectation en droit confidentiel permanent", () => {
    const confidential = { ...target, confidential: true, authorizedUserIds: [] };
    expect(canViewTicket({ id: "agent", roles: [{ code: RoleCode.AGENT }] }, confidential)).toBe(false);
  });

  it("évalue une portée équipe avec l’appartenance effective", () => {
    const teamTarget = { ...target, teamIds: ["team-network"] };
    const role = { code: RoleCode.AGENT, scope: { type: ScopeType.TEAM, teamId: "team-network" } };
    expect(canViewTicket({ id: "agent", teamIds: ["team-network"], roles: [role] }, teamTarget)).toBe(true);
    expect(canViewTicket({ id: "other", teamIds: ["team-hardware"], roles: [role] }, teamTarget)).toBe(false);
  });

  it("évalue une portée portefeuille et le Claim agent", () => {
    const portfolioTarget = { ...target, portfolioKeys: ["WIFI-CONNECTION", "Réseau"] };
    const role = { code: RoleCode.AGENT, scope: { type: ScopeType.PORTFOLIO, portfolioKey: "WIFI-CONNECTION" } };
    expect(canClaimTicket({ id: "agent", roles: [role] }, portfolioTarget)).toBe(true);
    expect(canClaimTicket({ id: "manager", roles: [{ code: RoleCode.QUEUE_MANAGER }] }, portfolioTarget)).toBe(false);
  });

  it("limite une portée liste nominative aux tickets des personnes listées", () => {
    const role = {
      code: RoleCode.REPORTING_READER,
      scope: { type: ScopeType.USER_LIST, userIds: ["requester"] },
    };
    expect(canViewTicket({ id: "reader", roles: [role] }, target)).toBe(false);
    expect(canReadReporting({ id: "reader", roles: [role] }, target)).toBe(true);
    expect(canReadReporting({ id: "reader", roles: [role] }, { ...target, requesterId: "other" })).toBe(false);
  });

  it("ne donne pas au lecteur de reporting un accès aux fiches de tickets", () => {
    const reader = { id: "reader", roles: [{ code: RoleCode.REPORTING_READER }] };
    expect(canViewTicket(reader, target)).toBe(false);
    expect(canReadReporting(reader, target)).toBe(true);
  });

  it("ne donne pas à l’administrateur technique un accès implicite aux dossiers confidentiels", () => {
    const confidential = { ...target, confidential: true, authorizedUserIds: [] };
    expect(canViewTicket({ id: "technical", roles: [{ code: RoleCode.TECHNICAL_ADMIN }] }, confidential)).toBe(false);
  });

  it("aligne le détail sur la visibilité de la file gérée sans élargir les tickets confidentiels", () => {
    const manager = { id: "manager", managedQueueIds: ["queue-network"], roles: [] };

    expect(canViewTicket(manager, target)).toBe(true);
    expect(canViewTicket(manager, { ...target, queueId: "queue-other" })).toBe(false);
    expect(canViewTicket(manager, { ...target, confidential: true, authorizedUserIds: [] })).toBe(false);
  });

  it("borne un agent global à ses équipes actives", () => {
    const agent = { id: "agent-global", roles: [{ code: RoleCode.AGENT }] };
    expect(canViewTicket(agent, { ...target, teamIds: ["team-network"] })).toBe(false);
    expect(canViewTicket({ ...agent, teamIds: ["team-network"] }, { ...target, teamIds: ["team-network"] })).toBe(true);
    expect(canViewTicket({ ...agent, teamIds: ["team-other"] }, { ...target, teamIds: ["team-network"] })).toBe(false);
  });

  it("ne laisse pas une équipe lire le ticket affecté à une autre équipe de la même file", () => {
    expect(canViewTicket(
      { id: "agent-a", teamIds: ["team-a"], roles: [{ code: RoleCode.AGENT }] },
      {
        ...target,
        requesterId: "requester-other",
        assignedToId: "agent-b",
        teamIds: ["team-a", "team-b"],
        assignedToTeamIds: ["team-b"],
      },
    )).toBe(false);
  });
});
