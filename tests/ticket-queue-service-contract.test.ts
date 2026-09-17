import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("module de consultation des files", () => {
  it("sépare les agrégats de file des mutations ticket", () => {
    const ticketService = source("lib/ticket-service.ts");
    const queueService = source("lib/ticket-queue-service.ts");

    expect(ticketService).not.toContain("export async function listVisibleQueues");
    expect(queueService).toContain("export async function listVisibleQueues");
    expect(queueService).toContain("export async function listVisibleQueueFilterOptions");
    expect(queueService).toContain('by: ["queueId", "status", "priority"]');
  });

  it("branche les écrans concernés sur le service de files", () => {
    for (const file of [
      "app/(app)/tickets/page.tsx",
      "app/(app)/queues/page.tsx",
      "app/(app)/inbox/page.tsx",
      "app/(app)/dashboard/responsible/page.tsx",
      "app/admin/tickets/page.tsx",
    ]) {
      expect(source(file)).toContain('from "@/lib/ticket-queue-service"');
    }
  });
});
