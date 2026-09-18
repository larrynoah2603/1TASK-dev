import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("frontières des services ticket", () => {
  it("isole les politiques de notification de file", () => {
    const facade = source("lib/ticket-service.ts");
    const notifications = source("lib/ticket-notification-service.ts");
    expect(facade).toContain('from "@/lib/ticket-notification-service"');
    expect(facade).not.toContain("async function queueWorkerIds");
    expect(notifications).toContain("export async function notifyQueueWorkers");
  });

  it("isole la sélection et la traçabilité des affectations", () => {
    const facade = source("lib/ticket-service.ts");
    const assignment = source("lib/ticket-assignment-service.ts");
    expect(facade).not.toContain("async function chooseAutoAssignee");
    expect(facade).not.toContain("async function recordAssignment");
    expect(assignment).toContain("export async function chooseAutoAssignee");
    expect(assignment).toContain("export async function recordAssignment");
  });

  it("isole les commandes de dérogation SLA", () => {
    const facade = source("lib/ticket-service.ts");
    const sla = source("lib/ticket-sla-service.ts");
    expect(facade).toContain('export { addSlaException } from "@/lib/ticket-sla-service"');
    expect(sla).toContain("export async function addSlaException");
  });

  it("isole la qualification dans le service de workflow", () => {
    const facade = source("lib/ticket-service.ts");
    const workflow = source("lib/ticket-workflow-service.ts");
    expect(facade).toContain('export { qualifyTicket, transitionTicket } from "@/lib/ticket-workflow-service"');
    expect(facade).not.toContain("export async function qualifyTicket");
    expect(workflow).toContain("export async function qualifyTicket");
    expect(workflow).toContain("export async function transitionTicket");
  });
});
