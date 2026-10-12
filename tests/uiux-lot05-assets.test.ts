import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("UI/UX lot 05 — Actifs V1 / Full", () => {
  it("conserve une seule commande personnelle de demande d'actif", () => {
    const page = source("app/(app)/my-assets/page.tsx");
    expect(page.match(/<AssetRequestDialog/g)).toHaveLength(1);
    expect(page).toContain("Matériel attribué");
    expect(page).toContain("Mes demandes récentes");
    expect(page).toContain("Approuvée · attente de stock");
  });
  it("conserve les filtres uniques, l'inventaire et la création", () => {
    const list = source("components/asset-list-client.tsx");
    expect(list).toContain("asset-filter-panel");
    expect(list).toContain("asset-filter-controls");
    expect(list).toContain('type="search"');
    expect(list).toContain("aria-live");
    expect(list).toContain('className="data-table asset-inventory-table"');
    expect(list).toContain("colSpan={7}");
    expect(list).toContain('fetch("/api/production/assets"');
    expect(list).toContain("router.push(");
  });
  it("conserve les mouvements et les dialogues accessibles", () => {
    const list = source("components/asset-list-client.tsx");
    const move = source("components/asset-detail-actions.tsx");
    expect(list).toContain("useDialogFocus");
    expect(move).toContain("useDialogFocus");
    expect(source("components/asset-request-dialog.tsx")).toContain("useDialogFocus");
    expect(list).toContain("<legend>1. Identification</legend>");
    expect(list).toContain("<legend>2. Affectation</legend>");
    expect(move).toContain("currentDepartmentId ??");
    expect(move).toContain("currentUserId ??");
    expect(move).toContain("/move");
  });
  it("conserve approbation, mise en attente et attribution", () => {
    const review = source("components/asset-request-review-table.tsx");
    expect(review).toContain("Approuver · attente stock");
    expect(review).toContain("Approuver et attribuer");
    expect(review).toContain("Attribuer");
    expect(review).toContain("colSpan={7}");
    expect(review).toContain("asset-review-table");
    expect(review).toContain('role="region"');
    expect(source("app/(app)/asset-requests/page.tsx")).toContain("isFunctionalAssetAdministrator(user)");
  });
  it("rend les deux tableaux et formulaires adaptatifs au conteneur", () => {
    const css = source("styles/asset-workspace.css");
    expect(source("app/globals.css")).toContain('@import "../styles/asset-workspace.css";');
    expect(css).toContain("@container asset-inventory (max-width: 760px)");
    expect(css).toContain("@container asset-review (max-width: 850px)");
    expect(css).toContain("@container asset-filters (max-width: 530px)");
    expect(css).toContain("html[data-theme]");
    expect(css).toContain("var(--kit-card)");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
