import { describe, expect, it } from "vitest";
import {
  missionListQuerySchema,
  notificationListQuerySchema,
  productionSearchQuerySchema,
} from "@/lib/validation";

describe("validation des paramètres API critiques", () => {
  it("borne strictement la pagination des notifications", () => {
    expect(notificationListQuerySchema.parse({}).take).toBe(50);
    expect(notificationListQuerySchema.parse({ take: "100" }).take).toBe(100);
    expect(notificationListQuerySchema.safeParse({ take: "101" }).success).toBe(false);
    expect(notificationListQuerySchema.safeParse({ take: "1.5" }).success).toBe(false);
  });

  it("borne la recherche production", () => {
    expect(productionSearchQuerySchema.parse({ q: "  client " }).q).toBe("client");
    expect(productionSearchQuerySchema.safeParse({ q: "x".repeat(121) }).success).toBe(false);
  });

  it("refuse les filtres mission inconnus ou mal formés", () => {
    expect(missionListQuerySchema.safeParse({ status: "UNKNOWN" }).success).toBe(false);
    expect(missionListQuerySchema.safeParse({ departmentId: "not-an-id" }).success).toBe(false);
    expect(missionListQuerySchema.safeParse({ take: "0" }).success).toBe(false);
  });
});
