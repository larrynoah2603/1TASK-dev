import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const styledSurfaces = [
  "components/new-ticket-form.tsx",
  "components/ticket-actions.tsx",
  "components/ticket-advanced-panels.tsx",
  "components/ticket-filters.tsx",
  "components/claim-ticket-button.tsx",
  "components/inbox/agent-ticket-table.tsx",
  "components/inbox/inbox-ticket-card.tsx",
  "components/inbox/inbox-filter-bar.tsx",
  "components/inbox/inbox-ticket-list.tsx",
  "components/inbox/inbox-detail-preview.tsx",
  "components/inbox/inbox-agent-panel.tsx",
  "components/inbox/inbox-page.tsx",
  "components/dashboard-visuals.tsx",
  "components/queues/queues-page.tsx",
  "components/admin-configuration-panel.tsx",
  "components/admin-notification-rules-panel.tsx",
  "components/admin-manager-search.tsx",
  "app/admin/page.tsx",
  "app/admin/technical/page.tsx",
  "components/notification-list.tsx",
];

describe("Finition V1 — uniformisation visuelle sans régression métier", () => {
  it.each(styledSurfaces)("%s utilise les tokens sémantiques, sans couleurs Tailwind historiques", (path) => {
    const body = source(path);
    expect(body, path).toContain("var(--kit-");
    expect(body, path).not.toMatch(/(?:(?:hover|focus|disabled|group-hover):)?(?:bg|text|border|divide|ring)-(?:slate|blue|cyan|teal|emerald|rose|amber|orange|indigo|purple|violet)-\d{2,3}(?:\/\d+)?/);
    expect(body, path).not.toMatch(/text-\[(?:10|11)px\]/);
  });

  it("conserve les invariants de création et confidentialité des tickets", () => {
    const form = source("components/new-ticket-form.tsx");
    expect(form).toContain('fetch("/api/tickets", {');
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain('toast(data.error ?? "La création a échoué.", "error")');
    expect(form).toContain("confidentialRecipient");
    expect(form).toContain("aria-busy={submitting}");
    expect(source("components/app-shell.tsx")).toContain("canCreate ? <NewTicketLauncher");
  });

  it("préserve le tableau, la vue rapide et les actions de traitement", () => {
    const table = source("components/inbox/agent-ticket-table.tsx");
    expect(table).toContain("colSpan={7}");
    expect(table).toContain("aria-expanded={expanded}");
    expect(table).toContain("ClaimTicketButton");
    expect(table).toContain("Ouvrir le ticket");
    const selected = source("components/inbox/inbox-ticket-card.tsx");
    expect(selected).toContain("aria-pressed={selected}");
    expect(selected).toContain("is-selected bg-[var(--kit-selected)]");
    expect(selected).not.toContain("#0f766e");
  });

  it("ne modifie pas les règles de notifications, l'authentification ou les permissions", () => {
    const rules = source("components/admin-notification-rules-panel.tsx");
    const config = source("components/admin-configuration-panel.tsx");
    expect(rules).toContain("ConfirmDialog");
    expect(rules).toContain('role="region" aria-label="Règles de notification, tableau défilant" tabIndex={0}');
    expect(rules).toContain("onClick={() => void toggle(rule)}");
    expect(config).toContain('"/api/admin/queues"');
    expect(config).toContain('"/api/admin/departments"');
    expect(config).toContain('data-tone={messageTone}');
    expect(source("app/admin/technical/page.tsx")).toContain("requireAdminAccess");
  });

  it("intègre une finition responsive et visible au clavier, conforme aux tokens approuvés", () => {
    const css = source("styles/v1-visual-finish.css");
    expect(source("app/globals.css")).toContain('@import "../styles/v1-visual-finish.css";');
    expect(css).toContain("html[data-theme]");
    expect(css).toContain(".inbox-ticket-card.is-selected");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("var(--kit-primary)");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    const tokens = source("styles/tokens.css");
    expect(tokens).toContain("--kit-brand: #EA7C29;");
    expect(tokens).toContain("--kit-primary: #C4510D;");
    expect(source("app/layout.tsx")).toContain("IBM_Plex_Sans");
  });
});
