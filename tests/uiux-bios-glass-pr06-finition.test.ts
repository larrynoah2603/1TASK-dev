import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const shell = read("styles/bios-glass-v31-shell-v1.css");
const pages = read("styles/bios-glass-v31-v1-pages.css");
const globals = read("app/globals.css");
const active = /^html\[data-visual-profile="bios-glass-v31"\]/;

describe("BIOS Glass v3.1 — PR06 : finition ciblée, sans activation en production", () => {
  it("conserve les feuilles CSS valides et entièrement limitées au profil opt-in", () => {
    for (const [path, css] of [
      ["styles/bios-glass-v31-shell-v1.css", shell],
      ["styles/bios-glass-v31-v1-pages.css", pages],
    ] as const) {
      const sheet = postcss.parse(css, { from: path });
      let rules = 0;
      sheet.walkRules((rule) => {
        rules += 1;
        expect(rule.selector.trim(), `${path} : ${rule.selector}`).toMatch(active);
      });
      expect(rules).toBeGreaterThan(20);
    }
    expect(globals).toContain('@import "../styles/bios-glass-v31-shell-v1.css";');
    expect(globals).toContain('@import "../styles/bios-glass-v31-v1-pages.css";');
    expect(read("app/layout.tsx")).toContain('process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development"');
    expect(read("components/uiux/bios-glass-preview-toggle.tsx")).toContain("delete document.documentElement.dataset.visualProfile");
  });

  it("distingue le panneau déroulant des filtres des cartes Glass de lecture", () => {
    const sheet = postcss.parse(shell);
    const normalRules = sheet.nodes.filter((node) => node.type === "rule");
    const workbenchCard = normalRules.find((node) =>
      node.type === "rule" && node.selector.includes(".inbox-workbench,")
      && node.selector.includes(".inbox-command-surface,"));
    expect(workbenchCard?.toString()).toContain("background: var(--bios-glass-card)");
    expect(workbenchCard?.toString()).not.toContain(".inbox-filter-panel");

    const filterPanel = normalRules.find((node) =>
      node.type === "rule" && node.selector.endsWith(".inbox-filter-panel"));
    const value = filterPanel?.toString() ?? "";
    expect(value).toContain("background: var(--bios-glass-raised)");
    expect(value).toContain("max-height: min(70dvh, 640px)");
    expect(value).toContain("overflow-y: auto");
    expect(value).toContain("overscroll-behavior: contain");
    expect(value).toContain("backdrop-filter: none");
    expect(value).toContain("color: var(--kit-text)");
  });

  it("préserve le rail SLA et une surface opaque en transparence réduite / flou indisponible", () => {
    const sheet = postcss.parse(shell);
    let supported = false;
    let reduced = false;
    sheet.walkAtRules((at) => {
      if (at.name === "supports" && at.params.includes("not")) {
        const source = at.toString();
        expect(source).toContain(".inbox-operations-industrial .agent-workspace-rail > section");
        expect(source).toContain(".inbox-filter-panel");
        expect(source).toContain("background: var(--kit-card) !important");
        supported = true;
      }
      if (at.name === "media" && at.params.includes("prefers-reduced-transparency")) {
        const source = at.toString();
        expect(source).toContain(".inbox-operations-industrial .agent-workspace-rail > section");
        expect(source).toContain("backdrop-filter: none");
        reduced = true;
      }
    });
    expect(supported).toBe(true);
    expect(reduced).toBe(true);
  });

  it("rend les notifications opaques sans backdrop et évite le flou des dialogues éditables", () => {
    const sheet = postcss.parse(pages);
    let noBlurSupport = false;
    let reducedTransparency = false;
    sheet.walkAtRules((at) => {
      if (at.name === "supports" && at.params.includes("not")) {
        expect(at.toString()).toContain(".notification-history-header, .notification-history-panel");
        expect(at.toString()).toContain("background: var(--kit-card) !important");
        noBlurSupport = true;
      }
      if (at.name === "media" && at.params.includes("prefers-reduced-transparency")) {
        expect(at.toString()).toContain(".notification-history-header, .notification-history-panel");
        expect(at.toString()).toContain("background: var(--kit-card) !important");
        reducedTransparency = true;
      }
    });
    expect(noBlurSupport).toBe(true);
    expect(reducedTransparency).toBe(true);

    const dialogs = sheet.nodes.find((node) =>
      node.type === "rule" && node.selector.includes(".confirm-dialog")
      && node.selector.includes(".combobox-listbox"));
    expect(dialogs?.toString()).toContain("background: var(--bios-glass-raised) !important");
    expect(dialogs?.toString()).toContain("backdrop-filter: none");
    expect(dialogs?.toString()).not.toContain("var(--bios-glass-backdrop)");
  });

  it("ne change ni la barre de navigation, ni les filtres uniques, ni les workflows V1", () => {
    const appShell = read("components/app-shell.tsx");
    const adminShell = read("components/admin-shell.tsx");
    const inboxPage = read("app/(app)/inbox/page.tsx");
    const inbox = read("components/inbox/inbox-workbench.tsx");
    const agentTable = read("components/inbox/agent-ticket-table.tsx");
    const form = read("components/new-ticket-form.tsx");
    expect(appShell.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(adminShell.split("<NewTicketLauncher")).toHaveLength(2);
    expect(inboxPage).toContain("<InboxWorkbench");
    expect(inbox.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(inbox).toContain("AgentTicketKanban");
    expect(agentTable).toContain("colSpan={7}");
    expect(agentTable).toContain("ClaimTicketButton");
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain("confidentialRecipient");
    expect(read("lib/product-policy.ts")).toContain("pushNotifications");
    expect(read("styles/tokens.css")).toContain("--kit-brand: #EA7C29;");
  });
});
