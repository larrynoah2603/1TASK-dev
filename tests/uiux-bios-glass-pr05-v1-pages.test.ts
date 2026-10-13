import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("styles/bios-glass-v31-v1-pages.css");
const globals = read("app/globals.css");

describe("BIOS Glass v3.1 — PR05, généralisation V1 sans rupture", () => {
  it("importe une CSS valide après PR04, uniquement en opt-in BIOS", () => {
    const sheet = postcss.parse(css, { from: "styles/bios-glass-v31-v1-pages.css" });
    let count = 0;
    sheet.walkRules((rule) => {
      count++;
      expect(rule.selector.trim(), rule.selector).toMatch(/^html\[data-visual-profile="bios-glass-v31"\]/);
    });
    expect(count).toBeGreaterThan(20);
    expect(globals).toContain('@import "../styles/bios-glass-v31-v1-pages.css";');
    expect(globals.indexOf("bios-glass-v31-v1-pages.css")).toBeGreaterThan(globals.indexOf("bios-glass-v31-shell-v1.css"));
    expect(css).not.toContain(":root {");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read("app/layout.tsx")).toContain("allowVisualPreview ? <BiosGlassPreviewToggle /> : null");
  });

  it("couvre les huit familles d'écrans V1, sans changer leurs composants TSX", () => {
    for (const area of [
      ".ticket-detail-industrial", ".queues-industrial", ".admin-industrial",
      ".assets-industrial", ".asset-review-page", ".asset-self-service-page",
      ".reporting-industrial", ".admin-reporting-industrial",
      ".notification-industrial", ".profile-industrial",
    ]) {
      expect(css, area).toContain(area);
    }
    for (const surface of [
      ".kit-panel", ".ticket-treatment-section", ".queue-card", ".admin-config-section",
      ".asset-inventory-panel", ".asset-review-card", ".reporting-chart-card",
      ".notification-history-panel",
    ]) {
      expect(css, surface).toContain(surface);
    }
    expect(css).toContain("background: var(--bios-glass-card) !important;");
    expect(css).toContain("background: var(--bios-glass-raised)");
    expect(css).toContain("border-radius: var(--kit-radius-lg)");
    expect(css).toContain("font-family: var(--kit-font-display)");
    expect(css).toContain("font-family: var(--kit-font-mono)");
  });

  it("préserve les tickets confidentiels, le traitement et les droits d'accès", () => {
    const detail = read("app/(app)/tickets/[id]/page.tsx");
    expect(detail).toContain("getTicketForViewer");
    expect(detail).toContain("<TicketActions");
    expect(detail).toContain("ticket-detail-workspace");
    expect(detail).toContain("ticket-treatment-rail");
    expect(detail).toContain("<TicketCommentThread");
    const form = read("components/new-ticket-form.tsx");
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain("confidentialRecipient");
    const agentTable = read("components/inbox/agent-ticket-table.tsx");
    expect(agentTable).toContain("colSpan={7}");
    expect(agentTable).toContain("ClaimTicketButton");
  });

  it("maintient actifs, rôles, reporting et notifications sans changer leurs flux", () => {
    const assets = read("components/asset-list-client.tsx");
    expect(assets).toContain("asset-inventory-scroll");
    expect(assets).toContain("data-label=");
    expect(assets).toContain('role="dialog"');
    const admin = read("app/admin/page.tsx");
    expect(admin).toContain("productionPortfolio");
    const reporting = read("app/(app)/reporting/page.tsx");
    expect(reporting).toContain("reportingPeriodFromQuery");
    expect(reporting).toContain('permissionCodes(user).includes("reporting:read")');
    const notifications = read("components/notifications/notifications-page.tsx");
    expect(notifications).toContain("<NotificationHeader");
    expect(notifications).toContain("nextCursor");
    const profile = read("app/(app)/profile/page.tsx");
    expect(profile).toContain("roleCodes");
    expect(read("lib/product-policy.ts")).toContain("pushNotifications");
  });

  it("protège la navigation, la commande Nouveau et le filtrage unique", () => {
    const shell = read("components/app-shell.tsx");
    const admin = read("components/admin-shell.tsx");
    const inbox = read("components/inbox/inbox-workbench.tsx");
    expect(shell.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(admin.split("<NewTicketLauncher")).toHaveLength(2);
    expect(inbox.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(inbox).toContain('id="inbox-filter-panel"');
    expect(read("styles/tokens.css")).toContain("--kit-primary: #C4510D;");
  });

  it("prévoit clair/sombre, clavier, mobile, flou et fallback opaque", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@supports not ((backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)))");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (max-width: 390px)");
    expect(css).toContain("background: var(--kit-card) !important;");
    expect(css).toContain("var(--kit-selected)");
    expect(css).toContain("var(--kit-primary)");
    const preview = read("styles/bios-glass-v31-preview.css");
    expect(preview).toContain('html[data-visual-profile="bios-glass-v31"][data-theme="dark"]');
  });
});
