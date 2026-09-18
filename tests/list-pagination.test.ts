import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizePageSize, toCursorPage } from "@/lib/cursor-pagination";
import { cursorPageQuerySchema, notificationListQuerySchema, productionSearchQuerySchema } from "@/lib/validation";

const projectRoot = process.cwd();
const source = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("pagination des listes à forte cardinalité", () => {
  it("borne les tailles de page et produit un curseur opaque", () => {
    expect(normalizePageSize(0)).toBe(1);
    expect(normalizePageSize(500)).toBe(100);
    expect(normalizePageSize(Number.NaN)).toBe(50);
    expect(toCursorPage([{ id: "a" }, { id: "b" }, { id: "c" }], 2)).toEqual({
      items: [{ id: "a" }, { id: "b" }],
      pageSize: 2,
      hasMore: true,
      nextCursor: "b",
    });
  });

  it("valide strictement les paramètres publics", () => {
    expect(cursorPageQuerySchema.parse({ pageSize: "25", cursor: "item-25" })).toEqual({
      pageSize: 25,
      cursor: "item-25",
    });
    expect(notificationListQuerySchema.safeParse({ take: "101" }).success).toBe(false);
    expect(productionSearchQuerySchema.safeParse({ pageSize: "0" }).success).toBe(false);
  });

  it("utilise take + 1, cursor et skip dans tous les services audités", () => {
    for (const path of [
      "lib/knowledge-service.ts",
      "lib/notification-service.ts",
      "lib/production-service.ts",
      "lib/admin-service.ts",
    ]) {
      const implementation = source(path);
      expect(implementation, path).toMatch(/take: (?:userP|p)ageSize \+ 1/);
      expect(implementation, path).toContain("cursor:");
      expect(implementation, path).toContain("skip: 1");
    }
  });

  it("retourne les métadonnées de continuation depuis les routes de liste", () => {
    for (const path of [
      "app/api/knowledge/route.ts",
      "app/api/notifications/route.ts",
      "app/api/production/clients/route.ts",
      "app/api/production/dossiers/route.ts",
      "app/api/production/assets/route.ts",
      "app/api/admin/users/route.ts",
    ]) {
      const route = source(path);
      expect(route, path).toContain("pagination");
      expect(route, path).toContain("nextCursor");
    }
  });

  it("laisse le reporting sur des agrégats SQL sans charger les tickets", () => {
    const reporting = source("lib/reporting-service.ts");
    expect(reporting).toContain("prisma.ticket.count");
    expect(reporting).toContain("prisma.ticket.groupBy");
    expect(reporting).not.toContain("prisma.ticket.findMany");
  });
});
