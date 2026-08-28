import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("régression boîte agent — lecture desktop", () => {
  it("regroupe les informations essentielles dans une table compacte sans retirer les actions", () => {
    const visuals = read("components/dashboard-visuals.tsx");
    const styles = read("app/globals.css");

    expect(visuals).toContain('className="dashboard-operation-table inbox-operations-table-complete"');
    expect(visuals).toContain('Demandeur : {ticket.requester.name}');
    expect(visuals).toContain("<PriorityBadge priority={ticket.priority} />");
    expect(visuals).toContain("<StatusBadge status={ticket.status} />");
    expect(visuals).toContain("<SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} compact />");
    expect(visuals).toContain("<ClaimTicketButton ticketId={ticket.id} />");
    expect(visuals).toContain("href={`/tickets/${ticket.id}` as Route}");
    expect(styles).toContain(".inbox-operations-table-complete");
    expect(styles).toContain("overflow-x: hidden;");
    expect(styles).toContain("min-width: 640px;");
  });
});

describe("régression résolution — transaction Prisma", () => {
  it("garde le ticket, son événement et son audit atomiques, puis notifie après le commit", () => {
    const ticketService = read("lib/ticket-service.ts");
    const start = ticketService.indexOf("export async function transitionTicket");
    const end = ticketService.indexOf("export async function addTicketMessage");
    const transition = ticketService.slice(start, end);

    expect(transition).toContain("await tx.ticketEvent.create");
    expect(transition).toContain("await appendAuditLog(tx");
    expect(transition).toContain("const notificationInputs: Parameters<typeof createInAppNotifications>[1] = []");
    expect(transition).not.toContain("createInAppNotification(tx");
    expect(transition).toContain("await createInAppNotifications(prisma, notificationInputs)");
    expect(transition).toContain("maxWait: 10_000");
    expect(transition).toContain("timeout: 15_000");
    expect(transition).toContain("resolutionCause");
    expect(transition).toContain("resolutionAction");
    expect(transition).toContain("resolutionSolution");
  });
});
