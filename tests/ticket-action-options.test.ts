import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("chargement différé des options d’action ticket", () => {
  it("ne charge pas agents et files dans le contexte d’action initial", () => {
    const service = source("lib/ticket-service.ts");
    const start = service.indexOf("export async function getTicketActionContext");
    const end = service.indexOf("async function requireTicketActionTarget", start);
    const actionContext = service.slice(start, end);
    expect(actionContext).not.toContain("prisma.ticket.findUnique");
    expect(actionContext).not.toContain("prisma.teamMember.findMany");
    expect(actionContext).not.toContain("prisma.queue.findMany");
  });

  it("réautorise côté serveur avant de charger les options différées", () => {
    const service = source("lib/ticket-service.ts");
    expect(service).toContain("async function requireTicketActionTarget");
    expect(service).toContain("canViewTicket(subject, target)");
    expect(service).toContain("export async function listTicketAssignmentOptions");
    expect(service).toContain("export async function listTicketTransferOptions");
  });

  it("charge chaque référentiel uniquement à l’ouverture de son panneau", () => {
    const actions = source("components/ticket-actions.tsx");
    expect(actions).toContain("onOpen={() => void loadAssignmentOptions()}");
    expect(actions).toContain("onOpen={() => void loadTransferOptions()}");
    expect(actions).toContain("action-options?kind=assign");
    expect(actions).toContain("action-options?kind=transfer");
  });
});
