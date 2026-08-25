import { RoleCode, ScopeType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  assertFunctionalAssetAdministrator,
  isFunctionalAssetAdministrator,
} from "@/lib/asset-access";
import { AuthorizationError, type UserContext } from "@/lib/server-auth";

function actorWithRole(code: RoleCode, scope: unknown = null): UserContext {
  return {
    id: `${code.toLowerCase()}-user`,
    departmentId: "dept-it",
    authorizedQueueId: null,
    teamMemberships: [],
    roleAssignments: [
      {
        scopeId: scope ? "scope-1" : null,
        role: { code, permissions: [] },
        scope,
      },
    ],
  } as unknown as UserContext;
}

describe("sécurité des Actifs", () => {
  it("autorise uniquement FUNCTIONAL_ADMIN global", () => {
    expect(isFunctionalAssetAdministrator(actorWithRole(RoleCode.FUNCTIONAL_ADMIN))).toBe(true);
    expect(isFunctionalAssetAdministrator(actorWithRole(RoleCode.AGENT))).toBe(false);
    expect(isFunctionalAssetAdministrator(actorWithRole(RoleCode.QUEUE_MANAGER))).toBe(false);
    expect(isFunctionalAssetAdministrator(actorWithRole(RoleCode.TECHNICAL_ADMIN))).toBe(false);
  });

  it("refuse un FUNCTIONAL_ADMIN scoped", () => {
    expect(isFunctionalAssetAdministrator(actorWithRole(RoleCode.FUNCTIONAL_ADMIN, {
      type: ScopeType.DEPARTMENT,
      departmentId: "dept-it",
      members: [],
    }))).toBe(false);
  });

  it("produit une erreur d’autorisation explicite hors périmètre", () => {
    expect(() => assertFunctionalAssetAdministrator(actorWithRole(RoleCode.AGENT))).toThrow(AuthorizationError);
    expect(() => assertFunctionalAssetAdministrator(actorWithRole(RoleCode.FUNCTIONAL_ADMIN))).not.toThrow();
  });
});
