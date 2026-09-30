import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deleteAdminSchema } from "@/lib/validation";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const admin = source("lib/admin-service.ts");

function section(start: string, end: string) {
  const from = admin.indexOf(start);
  const to = admin.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  return admin.slice(from, to < 0 ? undefined : to);
}

describe("suppression administrative sécurisée", () => {
  it("exige un motif explicite de 10 à 2000 caractères", () => {
    expect(deleteAdminSchema.safeParse({ reason: "court" }).success).toBe(false);
    expect(deleteAdminSchema.safeParse({ reason: "Configuration créée par erreur." }).success).toBe(true);
    expect(deleteAdminSchema.safeParse({ reason: "x".repeat(2001) }).success).toBe(false);
  });

  it("protège la suppression utilisateur et tout son historique", () => {
    const code = section("export async function deleteManagedUser", "export async function deleteDepartment");
    expect(code).toContain('requireFunctionalAdminFor(actor, "user:validate")');
    expect(code).toContain("current.id === userId");
    expect(code).toContain("activeAdmins <= 1");
    for (const model of ["ticket", "ticketMessage", "ticketEvent", "auditLog", "ticketAssignment", "worklog", "assetMovement", "assetRequest", "attachment", "knowledgeArticle", "slaException", "userProfileChange", "notification"]) {
      expect(code).toContain(`prisma.${model}.count`);
    }
    expect(code).toContain('action: "USER_DELETED"');
    expect(code).toContain("tx.user.delete");
  });

  it("bloque un département qui conserve des dépendances", () => {
    const code = section("export async function deleteDepartment", "export async function deleteQueue");
    expect(code).toContain("prisma.queue.count");
    expect(code).toContain("prisma.user.count");
    expect(code).toContain("sourceDepartmentId");
    expect(code).toContain("AdminServiceError(`Impossible de supprimer");
    expect(code).toContain('action: "DEPARTMENT_DELETED"');
  });

  it("bloque les files portant configuration ou historique et invalide le catalogue", () => {
    const code = section("export async function deleteQueue", "export async function deleteTeam");
    for (const model of ["ticket", "serviceCatalogItem", "team", "ticketAssignment", "ticketEvent"]) expect(code).toContain(`prisma.${model}.count`);
    expect(code).toContain('action: "QUEUE_DELETED"');
    expect(code).toContain('deleteCacheKey("catalog:active:v1")');
  });

  it("nettoie les dépendances configuratives d’une équipe dans la transaction", () => {
    const code = section("export async function deleteTeam", "export async function deleteCatalogItem");
    expect(code).toContain("tx.user.updateMany");
    expect(code).toContain("tx.teamMember.deleteMany");
    expect(code).toContain("tx.permissionScope.deleteMany");
    expect(code).toContain('action: "TEAM_DELETED"');
  });

  it("refuse un service utilisé, sinon le supprime et invalide le cache", () => {
    const code = section("export async function deleteCatalogItem", "export async function saveDepartment");
    expect(code).toContain("serviceCatalogItemId: serviceId");
    expect(code).toContain("doit être désactivé plutôt que supprimé");
    expect(code).toContain("tx.escalationRule.deleteMany");
    expect(code).toContain('action: "CATALOG_ITEM_DELETED"');
    expect(code).toContain('deleteCacheKey("catalog:active:v1")');
  });

  it.each(["users", "departments", "queues", "teams", "catalog"])("expose DELETE sur /api/admin/%s/[id]", (entity) => {
    const route = source(`app/api/admin/${entity}/[id]/route.ts`);
    expect(route).toContain("export async function DELETE");
    expect(route).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(route).toContain("payload.reason");
    expect(route).toContain("errorResponse(error)");
  });

  it("présente une confirmation motivée et protège le double clic", () => {
    const configuration = source("components/admin-configuration-panel.tsx");
    const users = source("components/admin-user-actions.tsx");
    const dialog = source("components/confirm-dialog.tsx");
    expect(configuration).toContain("Supprimer définitivement");
    expect(users).toContain("Supprimer définitivement");
    expect(configuration).toContain("deleteReason.trim().length < 10");
    expect(users).toContain("deleteReason.trim().length < 10");
    expect(dialog).toContain("busy || confirmDisabled");
  });
});
