import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const guide = source("docs/uiux/bios-glass-v31/README.md");
const fixture = source("docs/uiux/bios-glass-v31/reference.html");

describe("BIOS Glass Corporate v3.1 — PR 01 préparatoire", () => {
  it("documente les valeurs de référence sans exiger leur activation prématurée", () => {
    for (const required of [
      "#E8702A", "#D4601D", "#EEF0EC", "#14201D",
      "#E2E5E2", "#1F7A55", "#B42323", "#93590A",
      "Schibsted Grotesk", "IBM Plex Mono", "20 px", "62 %",
      "240 px", "56 px", "1360 px",
    ]) {
      expect(guide, required).toContain(required);
    }
    expect(guide).toContain("PR 02");
    expect(guide).toContain("retour arrière");
    expect(guide).toContain("préversion");
  });

  it("fournit trois écrans témoins et un thème sombre autonome sans route métier", () => {
    expect(fixture).toContain('id="view-dashboard"');
    expect(fixture).toContain('id="view-inbox"');
    expect(fixture).toContain('id="view-ticket"');
    expect(fixture).toContain('id="theme-button"');
    expect(fixture).toContain('html[data-theme="dark"]');
    expect(fixture).toContain('backdrop-filter:blur(20px)');
    expect(fixture).toContain("@media(max-width:700px)");
    expect(fixture).toContain("prefers-reduced-motion");
    expect(fixture).toContain("id=\"global-create-visual\"");
    expect(fixture).toContain('selection.value==="ticket"');
    expect(fixture).not.toContain('fetch(');
    expect(fixture).not.toContain('action="/api/');
    expect(fixture).not.toContain("next/navigation");
    expect(fixture).not.toContain('<script src="http');
  });

  it("préserve un seul lanceur Nouveau ticket dans le shell principal", () => {
    const shell = source("components/app-shell.tsx");
    const admin = source("components/admin-shell.tsx");
    expect(shell.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(shell).toContain("visibleLinks = links.filter");
    expect(shell).toContain("<NotificationCenter />");
    expect(admin).toContain("visibleLinks = adminLinks.filter");
    expect(admin.match(/<NewTicketLauncher\\b/g)).toHaveLength(1);
    expect(admin).toContain("simplified={!capabilities.confidentialTicketCreation && !capabilities.productionPortfolio}");
  });

  it("préserve le filtre unique et les parcours de réception de l'Inbox", () => {
    const inbox = source("components/inbox/inbox-workbench.tsx");
    const table = source("components/inbox/agent-ticket-table.tsx");
    expect(inbox.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(inbox).toContain('id="inbox-filter-panel"');
    expect(inbox).toContain('aria-expanded={filtersOpen}');
    expect(table).toContain("colSpan={7}");
    expect(table).toContain("aria-expanded={expanded}");
    expect(table).toContain("<ClaimTicketButton");
    expect(table).toContain("Ouvrir le ticket");
  });

  it("préserve les contrats idempotence, routage et notifications lors de la préparation", () => {
    const form = source("components/new-ticket-form.tsx");
    const policy = source("lib/product-policy.ts");
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain('fetch("/api/tickets", {');
    expect(form).toContain("confidentialRecipient");
    expect(form).toContain("onCreated");
    expect(form).toContain("aria-busy={submitting");
    expect(policy).toContain("productionPortfolio");
    expect(policy).toContain("pushNotifications");
  });

  it("maintient volontairement les tokens et le shell actifs hors de cette référence", () => {
    const globals = source("app/globals.css");
    const tokens = source("styles/tokens.css");
    const layout = source("app/layout.tsx");
    expect(globals).toContain('@import "../styles/tokens.css";');
    expect(globals).toContain('@import "../styles/legacy-bridge.css";');
    expect(globals).not.toContain("bios-glass-v31/reference.html");
    expect(tokens).toContain("--kit-primary:");
    expect(tokens).toContain("--kit-card:");
    expect(layout).toContain('import "./globals.css"');
  });
});
