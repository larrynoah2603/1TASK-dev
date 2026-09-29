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

  it("requires an asset for approval and a professional reason for rejection", () => {
    expect(assetRequestReviewSchema.safeParse({ decision: "APPROVE" }).success).toBe(false);
    expect(assetRequestReviewSchema.safeParse({ decision: "REJECT", rejectedReason: "Non" }).success).toBe(false);
  });
});
