import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("workflow V1 des demandes d’actifs", () => {
  it("garde Mes actifs limité aux actifs réellement attribués au compte", () => {
    const service = source("lib/asset-request-service.ts");
    expect(service).toContain("where: { assignedToId: actor.id }");
  });

  it("dépend de l’inventaire sans bloquer une demande quand le stock est vide", () => {
    const service = source("lib/asset-request-service.ts");
    const dialog = source("components/asset-request-dialog.tsx");
    expect(service).toContain("getRequesterAssetAvailability");
    expect(service).toContain("assignedToId: null");
    expect(service).toContain("status: AssetStatus.ACTIVE");
    expect(dialog).toContain("Aucun stock disponible actuellement");
    expect(dialog).toContain("Vous pouvez quand même envoyer la demande");
  });

  it("réserve la validation à l’administrateur fonctionnel et sépare approbation et attribution", () => {
    const service = source("lib/asset-request-service.ts");
    const access = source("lib/asset-access.ts");
    const review = source("components/asset-request-review-table.tsx");
    expect(service).toContain("assertAssetRequestReviewer(actor)");
    expect(access).toContain("isFunctionalAssetAdministrator(actor)");
    expect(service).toContain('parsed.decision === "APPROVE"');
    expect(service).toContain('parsed.decision === "ASSIGN"');
    expect(review).toContain("Approuver · attente stock");
    expect(review).toContain("Approuver et attribuer");
    expect(review).toContain("Attribuer");
  });

  it("crée un mouvement et notifie l’utilisateur lors de l’attribution", () => {
    const service = source("lib/asset-request-service.ts");
    expect(service).toContain("tx.assetMovement.create");
    expect(service).toContain('title: "Actif attribué"');
    expect(service).toContain('actionUrl: "/my-assets"');
    expect(service).toContain('action: "ASSET_REQUEST_ASSIGNED"');
  });

  it("rattache automatiquement un actif affecté à une seule demande approuvée en attente", () => {
    const requestService = source("lib/asset-request-service.ts");
    const productionService = source("lib/production-service.ts");

    expect(requestService).toContain("reconcileApprovedAssetRequestOnAssignment");
    expect(requestService).toContain("status: AssetRequestStatus.APPROVED");
    expect(requestService).toContain("assetId: null");
    expect(requestService).toContain("requesterId: input.assignedToId");
    expect(requestService).toContain("assetType: input.assetType");
    expect(requestService).toContain('status: "FULFILLED" as const');
    expect(requestService).toContain('title: "Actif attribué"');
    expect(productionService).toContain("await reconcileApprovedAssetRequestOnAssignment(tx");
  });

  it("ne choisit pas arbitrairement entre plusieurs demandes compatibles", () => {
    const requestService = source("lib/asset-request-service.ts");

    expect(requestService).toContain("take: 2");
    expect(requestService).toContain('status: "AMBIGUOUS" as const');
    expect(requestService).toContain('title: "Plusieurs demandes d’actifs à rapprocher"');
    expect(requestService).toContain('actionUrl: "/admin/asset-requests"');
  });

  it("trace l’attribution initiale et renseigne la date d’affectation", () => {
    const productionService = source("lib/production-service.ts");

    expect(productionService).toContain('reason: "Création et attribution initiale de l’actif."');
    expect(productionService).toContain("assignedAt,");
    expect(productionService).toContain("toUserId: asset.assignedToId");
  });

  it("permet de créer les accessoires qui peuvent être demandés", () => {
    const validation = source("lib/validation.ts");
    const inventory = source("components/asset-list-client.tsx");

    expect(validation).toContain('"ACCESSORY"');
    expect(inventory).toContain('ACCESSORY: "Accessoire"');
  });

  it("notifie les administrateurs fonctionnels globaux d’une nouvelle demande", () => {
    const service = source("lib/asset-request-service.ts");
    expect(service).toContain("RoleCode.FUNCTIONAL_ADMIN");
    expect(service).toContain("scopeId: null");
    expect(service).toContain('title: "Nouvelle demande d’actif"');
    expect(service).toContain('actionUrl: "/admin/asset-requests"');
  });
});
