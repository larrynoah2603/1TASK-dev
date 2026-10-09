import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("contrat scheduler QStash V1", () => {
  it("expose un endpoint POST protégé par CRON_SECRET", () => {
    const route = source("app/api/jobs/sla-monitor/route.ts");
    expect(route).toContain("readServerEnvironment().CRON_SECRET");
    expect(route).toContain('request.headers.get("authorization")');
    expect(route).toContain("authorization !== `Bearer ${cronSecret}`");
    expect(route).toContain("status: 403");
    expect(route).toContain("export const POST = run");
  });

  it("documente les schedules SLA et Web Push sans secret réel", () => {
    const doc = source("docs/v1-qstash-scheduler.md");
    expect(doc).toContain("*/5 * * * *");
    expect(doc).toContain("* * * * *");
    expect(doc).toContain("/api/jobs/outbox");
    expect(doc).toContain("NOTIFICATION_PUSH_REQUESTED");
    expect(doc).toContain("Upstash-Forward | Authorization | Bearer <CRON_SECRET>");
    expect(doc).toContain("Aucun secret QStash ni `CRON_SECRET` réel");
  });
});
