import { describe, expect, it } from "vitest";
import { RoleCode, ScopeType } from "@prisma/client";
import { canReadReporting, canViewTicket } from "@/lib/access-control";

describe("visibilité serveur", () => {
  const ticket = {
    requesterId: "requester-a",
    assignedToId: null,
    queueId: "queue-a",
    departmentId: "department-a",
    confidential: false,
  };

  it("ne transforme pas le département du profil en accès à tous les tickets", () => {
    const requester = { id: "requester-b", departmentId: "department-a", roles: [{ code: RoleCode.REQUESTER }] };
    expect(canViewTicket(requester, ticket)).toBe(false);
  });

  it("réserve le lecteur de reporting aux agrégats de son scope", () => {
    const scoped = { id: "reader", roles: [{ code: RoleCode.REPORTING_READER, scope: { type: ScopeType.DEPARTMENT, departmentId: "department-a" } }] };
    expect(canViewTicket(scoped, ticket)).toBe(false);
    expect(canReadReporting(scoped, ticket)).toBe(true);
    expect(canReadReporting(scoped, { ...ticket, departmentId: "department-b" })).toBe(false);
  });
});
