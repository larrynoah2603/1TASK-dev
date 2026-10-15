import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { usesCurrentPushKey } from "@/components/push-notification-button";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function fakeSubscription(key: Uint8Array | null): Pick<PushSubscription, "options"> {
  return {
    options: { applicationServerKey: key ? Uint8Array.from(key).buffer : null },
  } as Pick<PushSubscription, "options">;
}

describe("Web Push activation: don't mistake an existing subscription for delivery readiness", () => {
  it("compares the public VAPID key and detects a rotated key", () => {
    const oldKey = Uint8Array.from({ length: 65 }, (_, index) => index);
    const newKey = Uint8Array.from({ length: 65 }, (_, index) => index + 1);
    const publicKey = Buffer.from(newKey).toString("base64url");
    expect(usesCurrentPushKey(fakeSubscription(newKey), publicKey)).toBe(true);
    expect(usesCurrentPushKey(fakeSubscription(oldKey), publicKey)).toBe(false);
    // When a browser does not expose its historic key, preserve compatibility.
    expect(usesCurrentPushKey(fakeSubscription(null), publicKey)).toBe(true);
  });

  it("requires all three VAPID settings before the browser reports enabled", () => {
    const endpoint = source("app/api/notifications/push-subscriptions/route.ts");
    const button = source("components/push-notification-button.tsx");
    expect(endpoint).toContain("environment.WEB_PUSH_PUBLIC_KEY &&");
    expect(endpoint).toContain("environment.WEB_PUSH_PRIVATE_KEY &&");
    expect(endpoint).toContain("environment.WEB_PUSH_SUBJECT");
    expect(endpoint).toContain("publicKey: configured ? environment.WEB_PUSH_PUBLIC_KEY : null");
    expect(endpoint).not.toContain("WEB_PUSH_PRIVATE_KEY: environment");
    expect(button).toContain("const config = await getPushServerConfig()");
    expect(button).toContain("!config.configured || !config.publicKey");
    expect(button).toContain("!usesCurrentPushKey(subscription, config.publicKey)");
    expect(button).toContain("await syncSubscription(subscription)");
    expect(button).toContain("existing.endpoint !== subscription.endpoint");
    expect(button).toContain("Abonnement enregistré dans 1TASK");
  });

  it("shows a notification despite a stalled private requester-photo endpoint", async () => {
    const listeners: Record<string, (event: {data: {json(): unknown}; waitUntil(promise: Promise<unknown>): void}) => void> = {};
    const notifications: Array<{ title: string; options: {icon: string; body: string} }> = [];
    const timeouts: Array<() => void> = [];
    const sw = {
      addEventListener(name: string, callback: typeof listeners[string]) { listeners[name] = callback; },
      registration: {
        showNotification: async (title: string, options: { icon: string; body: string }) => {
          notifications.push({title, options});
        },
      },
    };
    vm.runInNewContext(source("public/push-sw.js"), {
      self: sw,
      AbortController,
      fetch: (_url: string, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("timeout")));
      }),
      setTimeout: (callback: () => void) => { timeouts.push(callback); return timeouts.length; },
      clearTimeout: () => {},
      URL,
    });
    let wait: Promise<unknown> = Promise.resolve();
    listeners.push({
      data: { json: () => ({
        notificationId: "notification-1",
        title: "1TASK",
        body: "Vous avez une demande",
        requesterPhotoUrl: "/api/notifications/push-photo/photo-id",
      }) },
      waitUntil: (promise) => { wait = promise; },
    });
    expect(timeouts).toHaveLength(1);
    expect(notifications).toHaveLength(0);
    timeouts[0](); // simulate the bounded wait, no network response
    await wait;
    expect(notifications).toEqual([{ title: "1TASK", options: expect.objectContaining({
      icon: "/push-icon.svg", body: "Vous avez une demande",
    }) }]);
  });

  it("retains direct notification rendering when there is no requester photo", async () => {
    const listeners: Record<string, (event: { data: {json(): unknown}; waitUntil(p: Promise<unknown>): void}) => void> = {};
    const notifications: string[] = [];
    vm.runInNewContext(source("public/push-sw.js"), {
      self: {
        addEventListener: (name: string, cb: typeof listeners[string]) => { listeners[name] = cb; },
        registration: { showNotification: async (_title: string, options: {icon: string}) => {notifications.push(options.icon);} },
      },
      URL, AbortController,
      fetch: () => {throw new Error("Photo must not be requested without URL");},
      setTimeout: () => {throw new Error("No photo, no timeout");},
      clearTimeout: () => {},
    });
    let wait: Promise<unknown> = Promise.resolve();
    listeners.push({data: {json: () => ({ title: "Ticket confidentiel" })}, waitUntil: (p) => {wait = p;}});
    await wait;
    expect(notifications).toEqual(["/push-icon.svg"]);
  });
});
