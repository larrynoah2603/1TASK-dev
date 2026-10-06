import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("configuration Vercel du moniteur SLA", () => {
  it("programme le job V1 toutes les cinq minutes", () => {
    const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };
    expect(vercel.crons).toContainEqual({
      path: "/api/jobs/sla-monitor",
      schedule: "*/5 * * * *",
    });
  });

  it("conserve l’authentification Bearer par CRON_SECRET", () => {
    const route = readFileSync(resolve(process.cwd(), "app/api/jobs/sla-monitor/route.ts"), "utf8");
    expect(route).toContain("readServerEnvironment().CRON_SECRET");
    expect(route).toContain("authorization !== `Bearer ${expected}`");
    expect(route).toContain("export const GET = run");
  });
});
