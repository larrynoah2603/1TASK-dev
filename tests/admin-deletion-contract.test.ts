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

  it("utilise le moteur central pour toutes les suppressions", () => {
    expect(admin).toContain("getDeletionImpact");
    for (const type of ["USER", "DEPARTMENT", "QUEUE", "TEAM", "CATALOG_ITEM"]) expect(admin).toContain(`requireDeletable("${type}"`);
    for (const action of ["USER_DELETED", "DEPARTMENT_DELETED", "QUEUE_DELETED", "TEAM_DELETED", "CATALOG_ITEM_DELETED"]) expect(admin).toContain(action);
    expect(admin).toContain('deleteCacheKey("catalog:active:v1")');
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
