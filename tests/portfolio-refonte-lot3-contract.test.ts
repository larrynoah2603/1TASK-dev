import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("lot 3 portfolio industrial visual contract", () => {
  it("keeps portfolio access controls and viewer-scoped client, dossier and mission retrieval", () => {
    const clients = source("app/(app)/clients/page.tsx");
    const dossiers = source("app/(app)/dossiers/page.tsx");
    const missions = source("app/(app)/missions/page.tsx");

    expect(clients).toContain('permissions.includes("portfolio:read")');
    expect(clients).toContain("listClientAccounts(user)");
    expect(dossiers).toContain("listDossiersForViewer(user)");
    expect(missions).toContain("listMissionsForViewer(user)");
    expect(`${clients}${dossiers}${missions}`).toContain("portfolio-industrial");
  });

  it("keeps secure detail retrieval and the ticket/dossier/mission relationships", () => {
    const clientDetail = source("app/(app)/clients/[id]/page.tsx");
    const dossierDetail = source("app/(app)/dossiers/[id]/page.tsx");
    const missionDetail = source("app/(app)/missions/[id]/page.tsx");

    expect(clientDetail).toContain("getClientForViewer(user");
    expect(dossierDetail).toContain("getDossierForViewer(user");
    expect(missionDetail).toContain("getMissionForViewer(user");
    expect(dossierDetail).toContain("dossier.confidential");
    expect(missionDetail).toContain("MissionDetailActions");
  });

  it("keeps existing client and dossier mutation endpoints while adding visual hooks only", () => {
    const clients = source("components/client-list-client.tsx");
    const dossiers = source("components/dossier-list-client.tsx");

    expect(clients).toContain('fetch("/api/production/clients", {');
    expect(dossiers).toContain('fetch("/api/production/dossiers", {');
    expect(`${clients}${dossiers}`).toContain("portfolio-query-panel");
    expect(`${clients}${dossiers}`).toContain("portfolio-table-surface");
  });

  it("contains a scoped lot 3 palette without new blue or violet accents", () => {
    const css = source("app/globals.css");
    const lotThree = css.slice(css.indexOf("Lot 3 — portefeuille industriel"));

    expect(lotThree).toContain(".portfolio-industrial");
    expect(lotThree).not.toMatch(/blue|cyan|indigo|violet|#4c4dba|#5b5bd6/i);
  });
});
