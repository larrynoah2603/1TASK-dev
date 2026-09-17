import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("module de détail ticket", () => {
  it("isole la projection détaillée et borne les historiques", () => {
    const detailService = source("lib/ticket-detail-service.ts");
    const ticketService = source("lib/ticket-service.ts");

    expect(detailService).toContain("async function getTicketForViewerInternal");
    expect(detailService).toContain("take: TICKET_MESSAGE_WINDOW");
    expect(detailService).toContain("take: TICKET_ASSIGNMENT_WINDOW");
    expect(detailService).toContain("take: TICKET_EVENT_WINDOW");
    expect(ticketService).not.toContain("async function getTicketForViewerInternal");
  });

  it("partage les projections d’accès et branche les consommateurs directs", () => {
    const access = source("lib/ticket-access.ts");
    expect(access).toContain("export function accessTarget");
    expect(access).toContain("export const ticketAccessInclude");
    expect(source("app/api/tickets/[id]/route.ts")).toContain('from "@/lib/ticket-detail-service"');
    expect(source("app/(app)/tickets/[id]/page.tsx")).toContain('from "@/lib/ticket-detail-service"');
  });
});
