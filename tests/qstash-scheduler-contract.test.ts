import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("contrat scheduler QStash V1", () => {
  it("expose un endpoint POST protégé par CRON_SECRET", () => {
    const route = source("app/api/jobs/sla-monitor/route.ts");
    const auth = source("lib/job-auth.ts");
    expect(route).toContain("getJobAuthorizationFailure");
    expect(auth).toContain("readServerEnvironment().CRON_SECRET");
    expect(auth).toContain('request.headers.get("authorization")');
    expect(auth).toContain('const prefix = "Bearer "');
    expect(auth).toContain("timingSafeEqual");
    expect(route).toContain("export const POST = run");
  });

  it("documente le schedule externe toutes les cinq minutes sans secret réel", () => {
    const doc = source("docs/v1-qstash-scheduler.md");
    expect(doc).toContain("*/5 * * * *");
    expect(doc).toContain("Upstash-Forward | Authorization | Bearer <CRON_SECRET>");
    expect(doc).toContain("Aucun secret QStash ni `CRON_SECRET` réel");
  });
});
