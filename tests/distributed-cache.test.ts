import { afterEach, describe, expect, it, vi } from "vitest";
import { cacheAside } from "@/lib/distributed-cache";

describe("cache distribué optionnel", () => {
  afterEach(() => {
    delete process.env.REDIS_REST_URL;
    delete process.env.REDIS_REST_TOKEN;
    vi.restoreAllMocks();
  });

  it("retombe sur PostgreSQL sans configuration Redis", async () => {
    const loader = vi.fn(async () => ({ value: 1 }));
    await expect(cacheAside("test:disabled", 30, loader)).resolves.toEqual({ value: 1 });
    expect(loader).toHaveBeenCalledOnce();
  });

  it("protège un cache miss concurrent par single-flight", async () => {
    process.env.REDIS_REST_URL = "https://redis.invalid";
    process.env.REDIS_REST_TOKEN = "token";
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      const command = JSON.parse(String(init?.body));
      return { ok: true, json: async () => ({ result: command[0] === "GET" ? null : "OK" }) };
    }));
    const loader = vi.fn(async () => ({ value: 2 }));
    await Promise.all([cacheAside("test:flight", 30, loader), cacheAside("test:flight", 30, loader)]);
    expect(loader).toHaveBeenCalledOnce();
  });
});
