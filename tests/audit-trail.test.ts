import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(resolve(process.cwd(), "lib/ticket-service.ts"), "utf8");

function implementation(name: string, nextName: string) {
  return service.slice(service.indexOf(`export async function ${name}`), service.indexOf(`export async function ${nextName}`));
}

describe("atomicité de la traçabilité ticket", () => {
  it("journalise qualification et dérogation SLA dans leurs transactions", () => {
    const qualification = implementation("qualifyTicket", "createTicketLink");
    const exception = implementation("addSlaException", "assignTicket");

    expect(qualification).toContain("prisma.$transaction");
    expect(qualification).toContain("tx.ticketEvent.create");
    expect(qualification).toContain("appendAuditLog(tx");
    expect(exception).toContain("tx.ticketEvent.create");
    expect(exception).toContain("appendAuditLog(tx");
    expect(exception).not.toContain("appendAuditLog(prisma");
  });

  it("conserve les échéances SLA avant et après une reprise", () => {
    const transition = implementation("transitionTicket", "addMessage");

    expect(transition).toContain("firstResponseDueAt: ticket.firstResponseDueAt");
    expect(transition).toContain("firstResponseDueAt: updated.firstResponseDueAt");
    expect(transition).toContain("resolutionDueAt: ticket.resolutionDueAt");
    expect(transition).toContain("resolutionDueAt: updated.resolutionDueAt");
  });
});
