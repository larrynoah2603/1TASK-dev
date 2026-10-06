import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("notifications et indicateur de boîte agent", () => {
  it("accepte les mutations de lecture utilisées par le centre de notifications", () => {
    const route = source("app/api/notifications/[id]/read/route.ts");
    expect(route).toContain("export const PATCH = markRead");
    expect(route).toContain("export const POST = markRead");
    expect(route).toContain("markNotificationAsRead");
  });

  it("marque la notification avant la navigation normale", () => {
    const center = source("components/notification-center.tsx");
    const item = source("components/notifications/notification-item.tsx");
    expect(center).toContain("event.preventDefault()");
    expect(center).toContain("await markRead(id)");
    expect(center).toContain("router.push(actionUrl as Route)");
    expect(item).toContain("event.preventDefault()");
    expect(item).toContain("await onRead(item.id)");
    expect(item).toContain("router.push(actionUrl as Route)");
  });

  it("affiche Mes tickets et un compteur visuel sur la boîte agent", () => {
    const shell = source("components/app-shell.tsx");
    const query = source("lib/ticket-query-service.ts");
    const mobile = source("components/layout/mobile-navigation.tsx");

    expect(shell).toContain('label: "Mes tickets"');
    expect(shell).toContain("countOperationalTickets(user)");
    expect(shell).toContain('link.href === "/inbox" && inboxTicketCount > 0');
    expect(shell).toContain('className="kit-nav-count"');
    expect(query).toContain("export async function countOperationalTickets");
    expect(query).toContain("TicketStatus.CLOSED");
    expect(query).toContain("TicketStatus.CANCELLED");
    expect(mobile).toContain('link.href === "/inbox"');
    expect(mobile).toContain("kit-bottom-badge");
  });
});
