import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findRouteFiles(entryPath);
    return entry.name === "route.ts" ? [entryPath] : [];
  });
}

describe("contrat d’autorisation des routes API", () => {
  it("interdit de redéfinir un garde de permission dans un handler", () => {
    const apiDirectory = path.resolve(process.cwd(), "app/api");
    const localPermissionGuards = findRouteFiles(apiDirectory).filter((routeFile) =>
      /function\s+requirePermission\s*\(/.test(readFileSync(routeFile, "utf8")),
    );

    expect(localPermissionGuards).toEqual([]);
  });

  it("interdit aux handlers d’évaluer eux-mêmes permissions et rôles", () => {
    const apiDirectory = path.resolve(process.cwd(), "app/api");
    const forbiddenAuthorizationLogic = findRouteFiles(apiDirectory).filter((routeFile) => {
      const route = readFileSync(routeFile, "utf8");
      return /\bhasPermission\s*\(|\bpermissionCodes\s*\(|roleAssignments|\.role\.code/.test(route);
    });

    expect(forbiddenAuthorizationLogic).toEqual([]);
  });

  it("centralise le périmètre du répertoire départemental", () => {
    const route = readFileSync(path.resolve(process.cwd(), "app/api/departments/route.ts"), "utf8");
    const authorization = readFileSync(path.resolve(process.cwd(), "lib/server-auth.ts"), "utf8");

    expect(route).toContain("requirePermissionForTicketCreationDepartments");
    expect(route).not.toContain("ticket:create:cross-department");
    expect(authorization).toContain('hasPermission(actor, "ticket:create:cross-department")');
  });

  it("interdit les enveloppes d’erreur ad hoc dans les routes", () => {
    const apiDirectory = path.resolve(process.cwd(), "app/api");
    const adHocErrorResponses = findRouteFiles(apiDirectory).filter((routeFile) =>
      /NextResponse\.json\s*\(\s*\{\s*error\s*:/.test(readFileSync(routeFile, "utf8")),
    );

    expect(adHocErrorResponses).toEqual([]);
  });
});
