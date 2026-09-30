import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("asset request server-side isolation", () => {
  it("derives personal asset and request scopes from the authenticated actor", () => {
    const service = source("lib/asset-request-service.ts");
    expect(service).toContain("assignedToId: actor.id");
    expect(service).toContain("requesterId: actor.id");
    expect(service).toContain("assertAssetRequestReviewer(actor)");
  });

  it("does not accept a requester id from either requester route", () => {
    expect(source("app/api/my-assets/route.ts")).toContain("requireSessionUserContext()");
    expect(source("app/api/asset-requests/route.ts")).toContain("requireSessionUserContext()");
    expect(source("app/api/asset-requests/route.ts")).not.toContain("requesterId:");
  });

  it("assigns and records the asset atomically before notification", () => {
    const service = source("lib/asset-request-service.ts");
    expect(service).toContain("prisma.$transaction");
    expect(service).toContain("assignedToId: request.requesterId");
    expect(service).toContain("createInAppNotification(tx");
    const review = service.slice(service.indexOf("export async function reviewAssetRequest"));
    expect(review.indexOf("assignedToId: request.requesterId")).toBeLessThan(
      review.indexOf("await notify(tx"),
    );
  });
});
