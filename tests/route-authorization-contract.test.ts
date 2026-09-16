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
});
