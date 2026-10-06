import { describe, expect, it } from "vitest";
import { assetRequestReviewSchema, assetRequestSchema } from "@/lib/validation";

describe("asset request validation", () => {
  it("accepts the four requester-facing asset families", () => {
    for (const assetType of ["COMPUTER", "PHONE", "ACCESSORY", "OTHER"]) {
      expect(assetRequestSchema.parse({ assetType, reason: "Besoin métier documenté", priority: "MEDIUM" }).assetType).toBe(assetType);
    }
  });

  it("rejects incomplete reasons and unsupported inventory types", () => {
    expect(assetRequestSchema.safeParse({ assetType: "LICENSE", reason: "Court", priority: "LOW" }).success).toBe(false);
  });

  it("allows approval without stock, requires an asset for later assignment and a professional rejection reason", () => {
    expect(assetRequestReviewSchema.safeParse({ decision: "APPROVE" }).success).toBe(true);
    expect(assetRequestReviewSchema.safeParse({ decision: "APPROVE", assetId: "ckx1234567890123456789012" }).success).toBe(true);
    expect(assetRequestReviewSchema.safeParse({ decision: "ASSIGN" }).success).toBe(false);
    expect(assetRequestReviewSchema.safeParse({ decision: "ASSIGN", assetId: "ckx1234567890123456789012" }).success).toBe(true);
    expect(assetRequestReviewSchema.safeParse({ decision: "REJECT", rejectedReason: "Non" }).success).toBe(false);
  });
});
