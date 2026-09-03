import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const monitor = readFileSync(resolve(process.cwd(), "lib/sla-monitor.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("performance du moniteur SLA", () => {
  it("parcourt tous les tickets éligibles par lots déterministes", () => {
    expect(monitor).toContain("const batchSize = 500");
    expect(monitor).toContain('orderBy: { id: "asc" }');
    expect(monitor).toContain("cursor: { id: cursor }");
    expect(monitor).toContain("scanned += tickets.length");
    expect(monitor).toContain("slaPausedAt: null");
  });

  it("indexe l'échéance de première réponse utilisée par le moniteur", () => {
    expect(schema).toContain("@@index([status, firstResponseDueAt])");
  });
});
