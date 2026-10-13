import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const modernized = [
  "app/(app)/profile/page.tsx",
  "app/(app)/assets/[id]/page.tsx",
  "components/admin-user-actions.tsx",
  "app/admin/audit/page.tsx",
  "app/(app)/queues/page.tsx",
  "components/ticket-table.tsx",
  "components/pagination.tsx",
  "components/admin-primitives.tsx",
  "components/asset-list-client.tsx",
];

describe("BIOS / 1TASK — finition visuelle transversale, sans régression V1", () => {
  it.each(modernized)("utilise les couleurs approuvées à la place des accents historiques dans %s", (path) => {
    const source = read(path);
    expect(source, path).not.toMatch(/(?:bg|text|border|divide|hover:bg|hover:text)-(?:slate|rose|amber|emerald|orange)-(?:50|100|200|400|500|600|700|800|900)(?:\/\d+)?\b/);
    expect(source, path).not.toMatch(/text-\[(?:10|11)px\]/);
    expect(source, path).toContain("var(--kit-");
  });

  it("garde la marque et la typographie 1TASK plutôt que d'importer la palette BIOS générique", () => {
    const tokens = read("styles/tokens.css");
    const layout = read("app/layout.tsx");
    expect(tokens).toContain("--kit-brand: #EA7C29;");
    expect(tokens).toContain("--kit-primary: #C4510D;");
    expect(tokens).toContain("--kit-bg: #F8F9FB;");
    expect(tokens).toContain("--kit-font: var(--font-ibm-plex-sans)");
    expect(layout).toContain('@fontsource-variable/ibm-plex-sans/wght.css');
    expect(read("app/globals.css")).toContain('--font-ibm-plex-sans: "IBM Plex Sans Variable";');
    expect(read("styles/bios-1task-finish.css")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("ne change ni le menu global ni la création des tickets", () => {
    const shell = read("components/app-shell.tsx");
    const table = read("components/ticket-table.tsx");
    expect(shell).toContain("canCreate ? <NewTicketLauncher");
    expect(shell).toContain("visibleLinks = links.filter");
    expect(table).toContain("StatusBadge");
    expect(table).toContain("ticket.reference");
    expect(table).toContain("ticket.queue.manager");
  });

  it("protège Entra ID, les autorisations d'actif, l'audit et le multi-rôle", () => {
    const profile = read("app/(app)/profile/page.tsx");
    const assets = read("app/(app)/assets/[id]/page.tsx");
    const roles = read("components/admin-user-actions.tsx");
    const audit = read("app/admin/audit/page.tsx");
    expect(profile).toContain("requireAuthenticatedUser()");
    expect(profile).toContain("roleCodes(user)");
    expect(profile).toContain("Microsoft Entra ID reste la source de l’identité");
    expect(assets).toContain("isFunctionalAssetAdministrator(user)");
    expect(assets).toContain("getAssetForViewer(user, id)");
    expect(assets).toContain("<AssetDetailActions");
    expect(roles).toContain("user.roleAssignments.map");
    expect(roles).toContain("roleRemovalReason.trim().length < 10");
    expect(roles).toContain("Retirer cette attribution");
    expect(audit).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(audit).toContain("listAuditLogsForViewerPage");
  });

  it("améliore lisibilité, clavier et mobile sans modifier les tokens de base", () => {
    const entry = read("app/globals.css");
    const css = read("styles/bios-1task-finish.css");
    expect(entry).toContain('@import "../styles/bios-1task-finish.css";');
    expect(css).toContain("html[data-theme]");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("var(--kit-text)");
    expect(css).not.toContain("Schibsted");
  });
});
