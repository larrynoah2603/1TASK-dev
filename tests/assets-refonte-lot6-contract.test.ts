import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("lot 6 assets industrial visual contract", () => {
  it("keeps assets limited to a global functional administrator", () => {
    const access = source("lib/asset-access.ts");
    const listPage = source("app/(app)/assets/page.tsx");
    const detailPage = source("app/(app)/assets/[id]/page.tsx");

    expect(access).toContain("RoleCode.FUNCTIONAL_ADMIN");
    expect(access).toContain("hasGlobalRole");
    expect(listPage).toContain("isFunctionalAssetAdministrator(user)");
    expect(detailPage).toContain("isFunctionalAssetAdministrator(user)");
    expect(listPage).toContain('if (!isFunctionalAdmin) redirect("/dashboard")');
    expect(detailPage).toContain('if (!isFunctionalAdmin) redirect("/dashboard")');
    expect(listPage).toContain("assets-industrial");
    expect(detailPage).toContain("assets-industrial");
  });

  it("keeps the existing inventory, creation and movement contracts", () => {
    const list = source("components/asset-list-client.tsx");
    const actions = source("components/asset-detail-actions.tsx");
    const detailPage = source("app/(app)/assets/[id]/page.tsx");

    expect(list).toContain('fetch("/api/production/assets"');
    expect(list).toContain("router.push(`${basePath}/${data.id}`");
    expect(actions).toContain("if (!canManage) return null");
    expect(actions).toContain("fetch(`/api/production/assets/${assetId}/move`");
    expect(detailPage).toContain("getAssetForViewer(user");
    expect(detailPage).toContain("listAssetMoveTargets(user)");
  });

  it("contains a scoped lot 6 palette without new blue or violet accents", () => {
    const css = source("app/globals.css");
    const lotSix = css.slice(css.indexOf("Lot 6 — actifs industriels"));

    expect(lotSix).toContain(".assets-industrial");
    expect(lotSix).toContain(".assets-detail-page-shell");
    expect(lotSix).not.toMatch(/blue|cyan|indigo|violet|#4c4dba|#5b5bd6/i);
  });
});
