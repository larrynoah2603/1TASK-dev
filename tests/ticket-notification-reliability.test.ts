import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ticket notification reliability", () => {
  it("persists creation notifications inside the ticket transaction", () => {
    const ticketService = source("lib/ticket-service.ts");
    const createSection = ticketService.slice(
      ticketService.indexOf("export async function createTicket"),
      ticketService.indexOf("export async function findCreatedTicketByToken"),
    );

    expect(createSection).toContain("await createInAppNotification(tx");
    expect(createSection).toContain("await notifyQueueWorkers(tx");
    expect(createSection).not.toContain("after(async");
    expect(createSection).not.toContain("ticket_creation_notification_failed");
  });

  it("creates retry-safe notifications for the receiving queue", () => {
    const queueNotifications = source("lib/ticket-notification-service.ts");

    expect(queueNotifications).toContain("const recipientIds = [...recipients]");
    expect(queueNotifications).toContain("deduplicationKey: `queue-notification:${input.type}:${input.ticketId}`");
    expect(queueNotifications).toContain("return recipientIds");
  });

  it("refreshes unread state while an authenticated app stays open", () => {
    const state = source("components/notification-state.tsx");
    const center = source("components/notification-center.tsx");

    expect(state).toContain("window.setInterval");
    expect(state).toContain("20_000");
    expect(state).toContain('window.addEventListener("focus"');
    expect(state).toContain('document.addEventListener("visibilitychange"');
    expect(center).toContain("if (next) void loadNotifications()");
  });

  it("does not mark an undelivered native push as sent", () => {
    const push = source("lib/push-notification-service.ts");

    expect(push).toContain("!notification.recipient.pushSubscriptions.length");
    expect(push).toContain('"NO_ACTIVE_SUBSCRIPTION"');
    expect(push).toContain('status: "FAILED"');
    expect(push).toContain('status: "SENT"');
  });
});
