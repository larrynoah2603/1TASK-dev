import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin visible role assignments", () => {
  it("loads concrete UserRole assignments with their scope for the users page", () => {
    const query = source("lib/admin-user-query-service.ts");

    expect(query).toContain("roleAssignments: { select: { id: true");
    expect(query).toContain("scope: { select:");
    expect(query).toContain("department: { select: { name: true } }");
    expect(query).toContain("queue: { select: { name: true } }");
    expect(query).toContain("team: { select: { name: true } }");
  });

  it("shows every current role below the primary-role selector", () => {
    const ui = source("components/admin-user-actions.tsx");

    expect(ui).toContain("Rôles actuellement attribués");
    expect(ui).toContain("user.roleAssignments.map");
    expect(ui).toContain("PRINCIPAL");
    expect(ui).toContain("BASE");
    expect(ui).toContain("roleScopeLabel");
    expect(ui).toContain("Retirer cette attribution");
  });

  it("requires an explicit confirmation and reason before removing a role", () => {
    const ui = source("components/admin-user-actions.tsx");

    expect(ui).toContain('method: "DELETE"');
    expect(ui).toContain("roleRemovalReason.trim().length < 10");
    expect(ui).toContain('confirmLabel="Retirer le rôle"');
    expect(ui).toContain("Les autres rôles de l’utilisateur sont conservés.");
  });

  it("protects baseline, primary and functional-admin safety invariants", () => {
    const service = source("lib/admin-service.ts");
    const start = service.indexOf("export async function removeAdminRoleAssignment");
    const end = service.indexOf("/** Compatibility wrapper", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("assignment.role.code === RoleCode.REQUESTER");
    expect(implementation).toContain("isPrimaryGlobalAssignment");
    expect(implementation).toContain("Vous ne pouvez pas retirer votre propre accès administrateur fonctionnel global");
    expect(implementation).toContain("Le dernier administrateur fonctionnel global ne peut pas être retiré");
    expect(implementation).toContain('action: "USER_ROLE_REMOVED"');
    expect(implementation).toContain('type: "ADMINISTRATIVE_ACTION"');
  });

  it("removes only the selected UserRole and never cascades team or queue changes", () => {
    const service = source("lib/admin-service.ts");
    const start = service.indexOf("export async function removeAdminRoleAssignment");
    const end = service.indexOf("/** Compatibility wrapper", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("tx.userRole.delete");
    expect(implementation).not.toContain("teamMember.delete");
    expect(implementation).not.toContain("queue.update");
    expect(implementation).not.toContain("primaryRoleCode:");
  });

  it("keeps authorization in the service and admin route", () => {
    const route = source("app/api/admin/users/[id]/roles/[assignmentId]/route.ts");
    const service = source("lib/admin-service.ts");

    expect(route).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(route).toContain("removeAdminRoleAssignment");
    expect(service).toContain('requireFunctionalAdminFor(actor, "role:manage")');
  });
});
