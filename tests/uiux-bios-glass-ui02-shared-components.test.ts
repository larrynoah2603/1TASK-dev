import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("styles/bios-glass-v31-components.css");
const adminReporting = read("app/admin/reporting/page.tsx");
const profile = read("styles/bios-glass-v31-preview.css");

function contrast(hexA: string, hexB: string) {
  const luminance = (value: string) => {
    const rgb = value.replace("#", "").match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
    const linear = rgb.map((x) => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const [a, b] = [luminance(hexA), luminance(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

describe("UI-02 — composants et tokens BIOS Glass sans régression V1", () => {
  it("borne chaque nouveau sélecteur CSS au profil BIOS sans toucher au thème normal", () => {
    const scoped = css.slice(css.indexOf("/* UI-02 — unification"));
    expect(scoped).not.toHaveLength(0);
    const stylesheet = postcss.parse(scoped, { from: "styles/bios-glass-v31-components.css" });
    let count = 0;
    stylesheet.walkRules((rule) => {
      count++;
      expect(rule.selector.trim(), rule.selector).toMatch(/^html\[data-visual-profile="bios-glass-v31"\]/);
    });
    expect(count).toBeGreaterThanOrEqual(9);
  });

  it("réutilise les tokens de verre et de couleurs existants, sans hex additionnels", () => {
    const scoped = css.slice(css.indexOf("/* UI-02 — unification"));
    for (const token of [
      "--bios-glass-card", "--bios-glass-menu", "--bios-glass-border",
      "--bios-glass-shadow", "--kit-text", "--kit-text-2", "--kit-border",
      "--kit-primary", "--kit-card",
    ]) expect(scoped).toContain(`var(${token})`);
    expect(scoped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // A narrow exception is needed for .table-shell against legacy-bridge.css.\n    expect((scoped.match(/!important/g) ?? [])).toHaveLength(6);\n    expect(scoped).toContain("html[data-visual-profile=\"bios-glass-v31\"][data-theme] .table-shell");
  });

  it("couvre les deux types de tableaux sans modifier le HTML métier", () => {
    const scoped = css.slice(css.indexOf("/* UI-02 — unification"));
    for (const selector of [
      ".ui-data-table", ".ui-data-table-scroll", ".ui-data-table th",
      ".ui-data-table td", ".table-shell", ".table-shell th", ".table-shell td",
    ]) expect(scoped, selector).toContain(selector);
    expect(scoped).toContain("padding: 11px 14px");
    expect(scoped).toContain("line-height: 22px");
    expect(scoped).toContain("overflow-x: auto");
    expect(scoped).toContain(":focus-visible");
    expect(read("components/ui/data-table.tsx")).toContain("colSpan={columns.length}");
    expect(read("components/inbox/agent-ticket-table.tsx")).toContain("colSpan={7}");
  });

  it("fournit des alternatives opaques sans supprimer le mode sombre", () => {
    const scoped = css.slice(css.indexOf("/* UI-02 — unification"));
    expect(scoped).toContain("@supports not ((backdrop-filter: blur(20px))");
    expect(scoped).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(scoped).toContain("backdrop-filter: none");
    expect(profile).toContain('html[data-visual-profile="bios-glass-v31"][data-theme="dark"]');
  });

  it("supprime les anciennes couleurs fixes du reporting admin, sans changer les filtres et exports", () => {
    for (const oldClass of ["text-slate-900", "text-slate-600", "text-slate-700", "bg-slate-100"]) {
      expect(adminReporting).not.toContain(oldClass);
    }
    expect(adminReporting).toContain("text-[var(--kit-text)]");
    expect(adminReporting).toContain("text-[var(--kit-text-2)]");
    expect(adminReporting).toContain("bg-[var(--kit-surface-muted)]");
    expect(adminReporting).toContain("<ReportingFilterClient period={period} />");
    expect(adminReporting).toContain('href="/api/reporting/export"');
    expect(adminReporting).toContain("summary.byStatus.map");
    expect(adminReporting).toContain('requireAdminAccess("FUNCTIONAL")');
  });

  it("mesure la lisibilité des combinaisons de tokens critiques, pas les pixels d'écran", () => {
    // These are exact approved BIOS tokens; this does not certify Glass compositing.
    expect(contrast("#14201D", "#E8702A")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#14201D", "#EEF0EC")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#3A4744", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#F2F7F3", "#192B23")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#B8C8C0", "#192B23")).toBeGreaterThanOrEqual(4.5);
  });

  it("conserve l'unique Nouveau de chaque shell et le filtre Inbox unique", () => {
    expect(read("components/app-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(read("components/admin-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    const inbox = read("components/inbox/inbox-workbench.tsx");
    expect(inbox.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(inbox).toContain('useState<InboxLayout>("list")');
  });
});
