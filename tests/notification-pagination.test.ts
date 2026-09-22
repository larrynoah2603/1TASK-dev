import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("historique notifications paginé", () => {
  it("n’est plus tronqué silencieusement à 100 éléments", () => {
    const page = readFileSync(resolve(process.cwd(), "app/(app)/notifications/page.tsx"), "utf8");
    const list = readFileSync(resolve(process.cwd(), "components/notification-list.tsx"), "utf8");
    expect(page).toContain("listUserNotificationsPage");
    expect(page).not.toContain("listUserNotifications(user, 100)");
    expect(list).toContain("loadMore");
    expect(list).toContain("nextCursor");
  });
});
