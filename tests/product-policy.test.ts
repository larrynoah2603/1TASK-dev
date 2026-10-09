import { describe, expect, it } from "vitest";
import { readServerEnvironment } from "@/lib/env";
import {
  assertProductCapability,
  ProductCapabilityDisabledError,
  resolveProductCapabilities,
} from "@/lib/product-policy";
import { errorResponse } from "@/lib/http";

describe("politique de capacités V1", () => {
  it("préserve toutes les capacités du profil historique par défaut", () => {
    const environment = readServerEnvironment({ DATABASE_URL: "postgresql://localhost/test" });
    expect(environment.PRODUCT_PROFILE).toBe("full");
    expect(Object.values(resolveProductCapabilities(environment.PRODUCT_PROFILE)).every(Boolean)).toBe(true);
  });

  it("rejette explicitement un profil inconnu", () => {
    expect(() => readServerEnvironment({ DATABASE_URL: "postgresql://localhost/test", PRODUCT_PROFILE: "partial" })).toThrow(/PRODUCT_PROFILE/);
  });

  it("garde le cœur V1 et désactive uniquement les intégrations et nouveaux usages hors périmètre", () => {
    const policy = resolveProductCapabilities("v1");
    expect(policy).toMatchObject({
      coreTickets: true, audit: true, slaCalendars: true, slaMonitoring: true,
      inAppNotifications: true, myAssets: true, assetAdministration: true,
      manualAssignment: true, claim: true,
      productionPortfolio: false, knowledge: false, confidentialTicketCreation: false,
      attachmentUploads: false, autoAssignment: false, workflowDefinitions: false,
      publicApiV1: false, pushNotifications: true, redisCache: false,
      externalOutboxDelivery: false, externalEmailDelivery: false,
    });
  });

  it("rend une réponse stable sans remplacer les contrôles d’autorisation", async () => {
    const policy = resolveProductCapabilities("v1");
    expect(() => assertProductCapability(policy, "attachmentUploads")).toThrow(ProductCapabilityDisabledError);
    const response = errorResponse(new ProductCapabilityDisabledError("attachmentUploads"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "FEATURE_DISABLED",
      context: { category: "FEATURE_DISABLED", details: { capability: "attachmentUploads" } },
    });
  });
});
