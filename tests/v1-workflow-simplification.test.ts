import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("workflow V1 simplifié", () => {
  it("affiche quatre étapes publiques sans supprimer les statuts internes", () => {
    const strip = source("components/ticket-status-strip.tsx");
    const domain = source("lib/domain.ts");
    expect(domain).toContain('V1_WORKFLOW_STEPS = ["RECEIVED", "IN_PROGRESS", "RESOLUTION", "CLOSED"]');
    expect(strip).toContain("simplifiedV1");
    expect(strip).toContain("V1_WORKFLOW_STEP_LABELS");
  });

  it("remplace le sélecteur V1 par des actions contextuelles", () => {
    const actions = source("components/ticket-actions.tsx");
    expect(actions).toContain('title={requesterView ? "Résolution" : "Traitement"}');
    expect(actions).toContain("Démarrer le traitement");
    expect(actions).toContain("Mettre en attente");
    expect(actions).toContain("Résoudre le ticket");
    expect(actions).toContain("Confirmer la résolution");
    expect(actions).toContain("Le problème persiste");
  });

  it("traite un administrateur demandeur comme demandeur en V1", () => {
    const service = source("lib/ticket-service.ts");
    const workflow = source("lib/ticket-workflow-service.ts");
    expect(service).toContain('const v1RequesterView = readServerEnvironment().PRODUCT_PROFILE === "v1" && requesterAction');
    expect(service).toContain("v1RequesterAllowedNextStatuses(ticket.status)");
    expect(workflow).toContain("v1RequesterAllowedNextStatuses(ticket.status).includes(parsed.status)");
    expect(workflow).toContain("isFunctionalAdministrator(actor) && !v1RequesterView");
  });

  it("fait démarrer le traitement lors d'un claim V1", () => {
    const service = source("lib/ticket-service.ts");
    expect(service).toContain('readServerEnvironment().PRODUCT_PROFILE === "v1"');
    expect(service).toContain("targetStatus: claimStatus");
    expect(service).toContain("toStatus: claimStatus");
  });
});
