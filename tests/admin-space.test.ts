import { describe, expect, it } from "vitest";
import { RoleCode, ScopeType } from "@prisma/client";
import { hasGlobalRole } from "@/lib/access-control";
import { errorResponse } from "@/lib/http";
import { AuthorizationError, isPendingFunctionalAdministrator } from "@/lib/server-auth";
import { notificationRuleAdminSchema, userStatusAdminSchema } from "@/lib/validation";

describe("espace administrateur séparé", () => {
  it("réserve l’espace global au rôle fonctionnel ou technique global", () => {
    expect(hasGlobalRole({ id: "user", roles: [{ code: RoleCode.REQUESTER }] }, RoleCode.FUNCTIONAL_ADMIN)).toBe(false);
    expect(hasGlobalRole({ id: "technical", roles: [{ code: RoleCode.TECHNICAL_ADMIN }] }, RoleCode.FUNCTIONAL_ADMIN)).toBe(false);
    expect(hasGlobalRole({ id: "functional", roles: [{ code: RoleCode.FUNCTIONAL_ADMIN }] }, RoleCode.FUNCTIONAL_ADMIN)).toBe(true);
    expect(hasGlobalRole({ id: "scoped", roles: [{ code: RoleCode.FUNCTIONAL_ADMIN, scope: { type: ScopeType.DEPARTMENT, departmentId: "dsi" } }] }, RoleCode.FUNCTIONAL_ADMIN)).toBe(false);
  });

  it("permet au bootstrap fonctionnel en attente de créer la correspondance Entra", () => {
    expect(isPendingFunctionalAdministrator({
      status: "PENDING_ASSIGNMENT",
      roleAssignments: [{ role: { code: RoleCode.FUNCTIONAL_ADMIN }, scopeId: null }],
    } as never)).toBe(true);
    expect(isPendingFunctionalAdministrator({
      status: "PENDING_VALIDATION",
      roleAssignments: [{ role: { code: RoleCode.FUNCTIONAL_ADMIN }, scopeId: null }],
    } as never)).toBe(true);
    expect(isPendingFunctionalAdministrator({
      status: "PENDING_VALIDATION",
      roleAssignments: [{ role: { code: RoleCode.REQUESTER }, scopeId: null }],
    } as never)).toBe(false);
  });

  it("exige une justification pour activer ou désactiver un compte", () => {
    expect(() => userStatusAdminSchema.parse({ status: "DISABLED", reason: "court" })).toThrow();
    expect(userStatusAdminSchema.parse({ status: "ACTIVE", reason: "Validation du compte après contrôle Entra" }).status).toBe("ACTIVE");
  });

  it("valide les règles de notification sans ouvrir de périmètre implicite", () => {
    const rule = notificationRuleAdminSchema.parse({
      name: "Alerte SLA responsable",
      eventType: "SLA_ALERT",
      channel: "IN_APP",
      recipientRole: "QUEUE_MANAGER",
      departmentId: null,
      queueId: null,
      reason: "Règle nécessaire pour les alertes de supervision SLA",
    });
    expect(rule.recipientRole).toBe(RoleCode.QUEUE_MANAGER);
  });

  it("conserve le contrat 403 pour une action administrative refusée", async () => {
    const response = errorResponse(new AuthorizationError("Zone réservée aux administrateurs."));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("administrateurs");
  });
});
