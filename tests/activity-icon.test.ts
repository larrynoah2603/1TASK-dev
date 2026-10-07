import { describe, expect, it } from "vitest";
import { ACTIVITY_ICON_MAP, formatRelativeActivityDate } from "@/components/activity-icon";
import { readFileSync } from "node:fs";

describe("activity icon mapping", () => {
  it("maps actual notification, ticket and asset request types", () => {
    for (const type of ["TICKET_CREATED", "TICKET_ASSIGNED", "MESSAGE_ADDED", "SLA_BREACH", "CLOSED", "PENDING", "APPROVED", "REJECTED"] as const) {
      expect(ACTIVITY_ICON_MAP[type], type).toBeDefined();
    }
  });

  it("formats a stable relative activity date", () => {
    const now = new Date("2026-09-29T12:00:00.000Z");
    expect(formatRelativeActivityDate("2026-09-29T11:45:00.000Z", now)).toBe("il y a 15 min");
    expect(formatRelativeActivityDate("2026-09-27T12:00:00.000Z", now)).toBe("il y a 2 j");
  });

  it("exposes the persisted notification type through the API", () => {
    expect(readFileSync("app/api/notifications/route.ts", "utf8")).toContain("item.type");
  });
  it("keeps shared activity timelines inset from their card borders", () => {
    const css = readFileSync("styles/design-system.css", "utf8");
    expect(css).toContain("padding: var(--kit-space-2) var(--kit-space-3); list-style: none;");

    for (const path of [
      "components/dashboard/activity-timeline.tsx",
      "components/inbox/agent-activity.tsx",
      "app/(app)/tickets/[id]/page.tsx",
    ]) {
      expect(readFileSync(path, "utf8"), path).toContain("<Timeline");
    }
  });

});
