import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("asset inventory and movement redesign", () => {
  it("gives the inventory a dedicated readable table hierarchy", () => {
    const list = source("components/asset-list-client.tsx");

    expect(list).toContain('className="panel asset-inventory-panel"');
    expect(list).toContain('className="asset-inventory-header"');
    expect(list).toContain('className="data-table asset-inventory-table"');
    expect(list).toContain('className="asset-inventory-primary"');
    expect(list).toContain('className="asset-inventory-action"');
    expect(list).toContain(">Voir</Link>");
  });

  it("organizes the movement dialog into destination and traceability sections", () => {
    const actions = source("components/asset-detail-actions.tsx");

    expect(actions).toContain("<legend>1. Nouvelle affectation</legend>");
    expect(actions).toContain("<legend>2. Motif du mouvement</legend>");
    expect(actions).toContain("L’affectation actuelle est préremplie");
    expect(actions).toContain('searchPlaceholder="Rechercher un utilisateur…"');
    expect(actions).toContain("Enregistrer le mouvement");
  });

  it("prefills the current assignment without changing the movement API", () => {
    const actions = source("components/asset-detail-actions.tsx");
    const detail = source("app/(app)/assets/[id]/page.tsx");

    expect(actions).toContain("currentDepartmentId ??");
    expect(actions).toContain("currentUserId ??");
    expect(actions).toContain('fetch(`/api/production/assets/${assetId}/move`');
    expect(detail).toContain("currentDepartmentId={asset.departmentId}");
    expect(detail).toContain("currentUserId={asset.assignedToId}");
  });

  it("keeps the redesign responsive and scoped to assets", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain(".asset-inventory-panel");
    expect(css).toContain(".asset-inventory-table");
    expect(css).toContain(".asset-move-modal");
    expect(css).toContain(".asset-move-modal .combobox-listbox");
    expect(css).toContain("@media (max-width: 700px)");
  });
});
