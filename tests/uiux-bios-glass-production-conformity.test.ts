import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const src = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const components = src("styles/bios-glass-v31-components.css");
const shell = src("styles/bios-glass-v31-shell-v1.css");
const pages = src("styles/bios-glass-v31-v1-pages.css");
const layout = src("app/layout.tsx");

describe("BIOS Glass — conformité transversale V1 et activation réversible", () => {
  it("active le design en production sans changer les pages ou la navigation V1", () => {
    expect(layout).toContain('process.env.VERCEL_ENV === "production"');
    expect(layout).toContain('process.env.BIOS_GLASS_ENABLED !== "false"');
    expect(layout).toContain('data-visual-profile={enableProductionBios ? "bios-glass-v31" : undefined}');
    expect(layout).toContain('allowVisualPreview ? <BiosGlassPreviewToggle /> : null');
    expect(layout).toContain('<ToastProvider>{children}</ToastProvider>');
    expect(src("components/app-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(src("components/admin-shell.tsx").split("<NewTicketLauncher")).toHaveLength(2);
  });

  it("garde chaque règle CSS ajoutée sous le profil BIOS (aucun effet hors opt-in)", () => {
    for (const [path, css] of [
      ["styles/bios-glass-v31-components.css", components],
      ["styles/bios-glass-v31-shell-v1.css", shell],
      ["styles/bios-glass-v31-v1-pages.css", pages],
    ] as const) {
      const sheet = postcss.parse(css, { from: path });
      let count = 0;
      sheet.walkRules((rule) => {
        count++;
        expect(rule.selector.trim(), rule.selector).toMatch(/^html\[data-visual-profile="bios-glass-v31"\]/);
      });
      expect(count).toBeGreaterThan(15);
    }
  });

  it("remplace explicitement l'ancien CTA bleu et sécurise les champs actifs", () => {
    expect(components).toContain(".kit-new-ticket.new-ticket-launcher");
    expect(components).toContain("background: var(--kit-primary) !important");
    expect(components).toContain("color: var(--kit-on-primary) !important");
    expect(components).toContain(".combobox-listbox");
    expect(components).toContain(".field-control");
    expect(components).toContain(":focus-visible");
  });

  it("évite de forcer un tableau Kanban de 1248px sur un ordinateur compact", () => {
    const scoped = shell.slice(shell.indexOf("/* Validation cross-vues"));
    expect(scoped).toContain(".agent-kanban-board");
    expect(scoped).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(scoped).toContain("min-width: 0");
    expect(scoped).toContain("@media (max-width: 1199px)");
    expect(scoped).toContain("grid-auto-flow: column");
    expect(src("components/inbox/inbox-workbench.tsx")).toContain('useState<InboxLayout>("list")');
    expect(src("components/inbox/inbox-workbench.tsx").match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(src("components/inbox/agent-ticket-table.tsx")).toContain("colSpan={7}");
  });

  it("harmonise liste tickets, administration, actifs et authentification sans toucher aux parcours", () => {
    for (const cls of [".ticket-reference-list", ".ticket-workspace", ".admin-industrial", ".admin-console-page", ".assets-industrial", ".signin-shell", ".pending-assignment-page"]) {
      expect(pages, cls).toContain(cls);
    }
    expect(pages).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(pages).toContain("background: var(--bios-glass-raised)");
    expect(pages).toContain(":focus-visible");
    expect(src("components/new-ticket-form.tsx")).toContain("creationIdempotencyToken");
    expect(src("components/new-ticket-form.tsx")).toContain("confidentialRecipient");
    expect(src("lib/product-policy.ts")).toContain("pushNotifications");
  });
});
