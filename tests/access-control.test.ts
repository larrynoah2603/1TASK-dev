import { describe, expect, it } from "vitest";
import { RoleCode, ScopeType } from "@prisma/client";
import { canClaimTicket, canReadReporting, canViewTicket } from "@/lib/access-control";

const target = { requesterId: "requester", assignedToId: "agent", queueId: "queue-network", departmentId: "dsi", confidential: false };

describe("cloisonnement", () => {
  it("ne donne pas aux utilisateurs hors file un accès global implicite", () => {
    expect(canViewTicket({ id: "other", departmentId: "compta", roles: [{ code: RoleCode.AGENT, scope: { type: ScopeType.QUEUE, queueId: "queue-other" } }] }, target)).toBe(false);
  });

  it("limite un dossier confidentiel aux personnes nominatives", () => {
    const confidential = { ...target, confidential: true, authorizedUserIds: ["authorized"] };
    expect(canViewTicket({ id: "authorized", roles: [] }, confidential)).toBe(true);
    expect(canViewTicket({ id: "other", roles: [{ code: RoleCode.FUNCTIONAL_ADMIN }] }, confidential)).toBe(false);
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
