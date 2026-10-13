import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("styles/bios-glass-v31-shell-v1.css");
const globals = read("app/globals.css");

function linear(hex: string) {
  const rgb = [1, 3, 5].map((pos) => Number.parseInt(hex.slice(pos, pos + 2), 16) / 255);
  return rgb.reduce((sum, x, i) => sum + (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(one: string, two: string) {
  const a = linear(one), b = linear(two);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
describe("BIOS Glass v3.1 — PR04 Shell & premiers écrans V1", () => {
  it("utilise une feuille valide, importée après la PR03 et sans règle CSS active hors opt-in", () => {
    const sheet = postcss.parse(css);
    let rules = 0;
    sheet.walkRules((rule) => {
      rules++;
      expect(rule.selector.trim(), rule.selector).toMatch(/^html\[data-visual-profile="bios-glass-v31"\]/);
    });
    expect(rules).toBeGreaterThan(15);
    expect(globals).toContain('@import "../styles/bios-glass-v31-shell-v1.css";');
    expect(globals.indexOf("bios-glass-v31-shell-v1.css")).toBeGreaterThan(globals.indexOf("bios-glass-v31-components.css"));
    expect(css).not.toContain(":root {");
    expect(read("app/layout.tsx")).toContain("allowVisualPreview ? <BiosGlassPreviewToggle /> : null");
  });

  it("change visiblement les dimensions et la navigation seulement en mode BIOS", () => {
    for (const token of ["--kit-sidebar-w: 240px;", "--kit-sidebar-w-collapsed: 64px;", "--kit-topbar-h: 56px;", "--kit-content-max: 1360px;", "--bios-page-gap: 18px;"]) {
      expect(css).toContain(token);
    }
    expect(css).toContain('.kit-nav-item[aria-current="page"]');
    expect(css).toContain("background: var(--kit-text);");
    expect(css).toContain("color: var(--kit-bg);");
    expect(css).toContain("backdrop-filter: blur(20px);");
    expect(css).toContain("font-family: var(--kit-font-display);");
    const prod = read("styles/tokens.css");
    expect(prod).toContain("--kit-sidebar-w-collapsed: 68px;");
    expect(prod).toContain("--kit-content-max: 1440px;");
    expect(prod).toContain("--kit-primary: #C4510D;");
    const preview = read("styles/bios-glass-v31-preview.css");
    expect(preview).toContain("--kit-bg: #EEF0EC;");
    expect(preview).toContain("--kit-text: #14201D;");
    expect(contrast("#14201D", "#EEF0EC")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#EEF0EC", "#14201D")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#101B18", "#F2F7F3")).toBeGreaterThanOrEqual(4.5);
  });

  it("donne des cartes réellement Glass aux Dashboard malgré l'ancien bridge opaque", () => {
    expect(css).toContain(".dashboard-kpi-card,");
    expect(css).toContain(".dashboard-widget,");
    expect(css).toContain(".dashboard-modern-kpi");
    expect(css).toContain("background: var(--bios-glass-card) !important;");
    expect(css).toContain("border-radius: var(--kit-radius-lg) !important;");
    expect(css).toContain("font-family: var(--kit-font-mono);");
    expect(css).not.toContain("display: none");
  });

  it("préserve les données et l'unique barre de filtres / l'aperçu des tickets de l'Inbox", () => {
    const inbox = read("app/(app)/inbox/page.tsx");
    const workbench = read("components/inbox/inbox-workbench.tsx");
    const table = read("components/inbox/agent-ticket-table.tsx");
    expect(inbox).toContain("<InboxWorkbench");
    expect(inbox).toContain("<AgentKpiGrid");
    expect(inbox).toContain("<InboxSlaWatch");
    expect(workbench.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(workbench).toContain('id="inbox-filter-panel"');
    expect(workbench).toContain("aria-expanded={filtersOpen}");
    expect(table).toContain("colSpan={7}");
    expect(table).toContain("<ClaimTicketButton");
    expect(css).toContain(".inbox-command-surface,");
    expect(css).toContain(".inbox-scope-tabs .is-active,");
    expect(css).toContain(".inbox-search-box input");
  });

  it("préserve la création, l'idempotence, le routage et le bouton unique par shell", () => {
    const shell = read("components/app-shell.tsx");
    const admin = read("components/admin-shell.tsx");
    const form = read("components/new-ticket-form.tsx");
    expect(shell.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(admin.split("<NewTicketLauncher")).toHaveLength(2);
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain('fetch("/api/tickets", {');
    expect(form).toContain("confidentialRecipient");
    expect(form).toContain("aria-busy={submitting");
    expect(css).toContain(".ticket-composer .field-control:focus-visible");
    expect(css).toContain("background: var(--bios-glass-raised) !important;");
    expect(read("lib/product-policy.ts")).toContain("pushNotifications");
  });

  it("prévoit contraste, clavier, mobiles, alternatives au flou et contrôle du mouvement", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@supports not ((backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)))");
    expect(css).toContain("background: var(--kit-card) !important;");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
