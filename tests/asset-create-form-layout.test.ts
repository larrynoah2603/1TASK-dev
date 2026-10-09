import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("asset creation form layout", () => {
  it("groups creation into identification, assignment and license sections", () => {
    const form = source("components/asset-list-client.tsx");

    expect(form).toContain("<legend>1. Identification</legend>");
    expect(form).toContain("<legend>2. Affectation</legend>");
    expect(form).toContain("<legend>3. Licence</legend>");
    expect(form).toContain("Son affectation peut être faite maintenant ou plus tard.");
    expect(form).toContain("laissez l’actif disponible dans l’inventaire");
  });

  it("shows license expiry only for license assets", () => {
    const form = source("components/asset-list-client.tsx");

    expect(form).toContain('assetType === "LICENSE"');
    expect(form).toContain('if (value !== "LICENSE") setLicenseExpiresAt("")');
    expect(form).toContain("Échéance de licence");
  });

  it("keeps the existing creation API and successful redirect", () => {
    const form = source("components/asset-list-client.tsx");

    expect(form).toContain('fetch("/api/production/assets"');
    expect(form).toContain("router.push(`${basePath}/${data.id}`");
    expect(form).toContain("body: JSON.stringify({ assetTag, type: assetType, name, serialNumber: serialNumber || null, departmentId: departmentId || null, assignedToId: assignedToId || null");
  });

  it("keeps assignment dropdowns usable inside the modal", () => {
    const form = source("components/asset-list-client.tsx");
    const combobox = source("components/combobox.tsx");
    const css = source("styles/design-system.css");

    expect(form).toContain("searchable");
    expect(form).toContain('searchPlaceholder="Rechercher un utilisateur…"');
    expect(combobox).toContain("filteredOptions");
    expect(combobox).toContain('type="search"');
    expect(css).toContain(".asset-create-modal { width: min(680px, calc(100vw - 2rem)); padding: 0; overflow: visible; }");
    expect(css).toContain(".asset-create-modal .combobox-listbox { position: static;");
  });

  it("reuses the responsive structured form styles", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain(".asset-create-modal");
    expect(css).toContain(".form-section");
    expect(css).toContain(".form-grid");
    expect(css).toContain(".form-actions");
  });
});
