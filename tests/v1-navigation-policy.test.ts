import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ProductCapabilityDisabledError, resolveProductCapabilities } from "@/lib/product-policy";

const source = (path: string) => readFileSync(path, "utf8");

describe("profil V1 — navigation et modules dormants", () => {
  it("conserve les actifs tout en désactivant portefeuille et connaissance", () => {
    const capabilities = resolveProductCapabilities("v1");
    expect(capabilities.myAssets).toBe(true);
    expect(capabilities.assetAdministration).toBe(true);
    expect(capabilities.productionPortfolio).toBe(false);
    expect(capabilities.knowledge).toBe(false);
    expect(new ProductCapabilityDisabledError("productionPortfolio").code).toBe("FEATURE_DISABLED");
  });

  it("protège les API portefeuille mais conserve les API d'actifs", () => {
    for (const path of [
      "app/api/production/clients/route.ts",
      "app/api/production/dossiers/route.ts",
      "app/api/production/missions/route.ts",
      "app/api/production/worklogs/route.ts",
    ]) expect(source(path)).toContain('requireProductCapability("productionPortfolio")');
    expect(source("app/api/production/assets/route.ts")).not.toContain('requireProductCapability("productionPortfolio")');
    expect(source("app/api/production/assets/[id]/move/route.ts")).not.toContain('requireProductCapability("productionPortfolio")');
  });

  it("oriente chaque notification d'actif vers la vue de son destinataire", () => {
    const service = source("lib/asset-request-service.ts");
    expect(service.match(/actionUrl: "\/my-assets"/g)).toHaveLength(3);
    expect(service).not.toContain('actionUrl: "/asset-requests"');
  });

  it("réutilise le reporting autorisé pour la supervision SLA sans portefeuille", () => {
    const page = source("app/(app)/reporting/page.tsx");
    expect(page).toContain('permissionCodes(user).includes("reporting:read")');
    expect(page).toContain("ReportingSlaOversight");
    expect(page).not.toContain("listMissionsForViewer");
  });
});
