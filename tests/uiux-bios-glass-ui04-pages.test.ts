import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = file("styles/bios-glass-v31-v1-pages.css");
const ui04 = css.slice(css.indexOf("/* UI-04 — harmonisation ciblée"));
const signin = file("app/signin/page.tsx");
const pending = file("app/pending-assignment/page.tsx");

describe("UI-04 — cohérence BIOS Glass des vues secondaires sans changement métier", () => {
  it("ajoute uniquement du CSS BIOS valide, sans nouvelles couleurs hex ou disparition d'actions", () => {
    expect(ui04.length).toBeGreaterThan(1800);
    const root = postcss.parse(ui04, { from: "styles/bios-glass-v31-v1-pages.css" });
    let rules = 0;
    root.walkRules((rule) => {
      rules++;
      expect(rule.selector.trim(), rule.selector).toMatch(/^html\[data-visual-profile="bios-glass-v31"\]/);
    });
    expect(rules).toBeGreaterThan(14);
    expect(ui04).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(ui04).not.toContain("display: none");
    expect(ui04).not.toContain("!important");
  });

  it("couvre les zones admin, actifs, reporting, notifications et profil", () => {
    for (const scope of [
      ".admin-dashboard-industrial", ".admin-console-page", ".admin-reporting-industrial",
      ".assets-industrial", ".asset-review-page", ".asset-self-service-page",
      ".notification-industrial", ".profile-industrial",
    ]) expect(ui04).toContain(scope);
    for (const token of [
      "--kit-text", "--kit-primary", "--kit-text-2", "--kit-selected",
      "--kit-surface-muted", "--bios-glass-border", "--bios-glass-raised",
      "--kit-font-mono", "--kit-font-display",
    ]) expect(ui04).toContain(`var(${token})`);
    expect(ui04).toContain("font-variant-numeric: tabular-nums");
  });

  it("remplace les fonds et textes codés en dur des vues Entra par les tokens 1TASK", () => {
    for (const page of [signin, pending]) {
      expect(page).not.toMatch(/(?:text|bg|border)-(?:slate|amber|rose|indigo)-(?:\d+)/);
      expect(page).toContain("var(--kit-text)");
      expect(page).toContain("var(--kit-text-2)");
    }
    expect(signin).toContain("var(--kit-danger-soft)");
    expect(signin).toContain("var(--kit-danger-text)");
    expect(pending).toContain("var(--kit-warning-soft)");
    expect(pending).toContain("var(--kit-warning-text)");
  });

  it("préserve l'authentification et les redirections Entra, et l'absence d'activation automatique des rôles", () => {
    expect(signin).toContain('await signIn(provider, { callbackUrl })');
    expect(signin).toContain('"microsoft-entra-id"');
    expect(signin).toContain("getCallbackUrl");
    expect(signin).toContain("useState<ProviderId | null>(null)");
    expect(pending).toContain("getSessionUserContext()");
    expect(pending).toContain('redirect("/signin")');
    expect(pending).toContain('redirect("/dashboard")');
    expect(pending).toContain("En attente d’affectation administrative");
    expect(pending).toContain("département, un rôle, une équipe ou une file");
  });

  it("ne change pas les actions admin, les droits du reporting ni les décisions d'actifs", () => {
    const admin = file("app/admin/page.tsx");
    const reporting = file("app/admin/reporting/page.tsx");
    const assets = file("components/asset-list-client.tsx");
    const assetReview = file("components/asset-request-review-table.tsx");
    expect(admin).toContain('requireAdminAccess("ANY")');
    expect(admin).toContain("productionPortfolio");
    expect(reporting).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(reporting).toContain('href="/api/reporting/export"');
    expect(reporting).toContain("<ReportingFilterClient period={period} />");
    expect(assets).toContain("asset-inventory-scroll");
    expect(assets).toContain("data-label=");
    expect(assetReview).toContain("review-actions");
    expect(assetReview).toContain("APPROVED");
    expect(assetReview).toContain("REJECTED");
  });

  it("ne supprime pas les notifications, leurs statuts ni la photo et les rôles du profil", () => {
    const notifications = file("components/notifications/notifications-page.tsx");
    const item = file("components/notifications/notification-item.tsx");
    const profile = file("app/(app)/profile/page.tsx");
    expect(notifications).toContain("nextCursor");
    expect(notifications).toContain("<NotificationHeader");
    expect(item).toContain("is-unread");
    expect(item).toContain("onRead");
    expect(profile).toContain("roleCodes(user)");
    expect(profile).toContain("user.image");
    expect(profile).toContain("roles.map");
    expect(ui04).toContain("overflow-wrap: anywhere");
    expect(ui04).toContain("@media (max-width: 640px)");
  });

  it("préserve la navigation, le bouton Nouveau unique et les parcours Inbox", () => {
    expect(file("components/app-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(file("components/admin-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(file("components/inbox/inbox-workbench.tsx").match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(file("components/inbox/agent-ticket-table.tsx")).toContain("colSpan={7}");
  });
});
