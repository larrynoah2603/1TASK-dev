import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const dropdown = read("components/ui/dropdown.tsx");
const css = read("styles/bios-glass-v31-components.css");

describe("UI-06 — menus accessibles sans changement de navigation V1", () => {
  it("referme le menu sur Échap et restitue le focus au déclencheur", () => {
    expect(dropdown).toContain('if (event.key !== "Escape") return;');
    expect(dropdown).toContain("event.preventDefault();");
    expect(dropdown).toContain("event.stopPropagation();");
    expect(dropdown).toContain("triggerRef.current?.focus();");
    expect(dropdown).toContain("onKeyDown={handlePanelKeyDown}");
    expect(dropdown).toContain("onBlurCapture");
    expect(dropdown).toContain("if (!event.currentTarget.contains(event.relatedTarget)) close();");
  });

  it("lie le déclencheur au panneau et garde les sémantiques menu/dialog", () => {
    expect(dropdown).toContain("const panelId = useId();");
    expect(dropdown).toContain("aria-expanded={open}");
    expect(dropdown).toContain("aria-controls={open ? panelId : undefined}");
    expect(dropdown).toContain("aria-haspopup={role}");
    expect(dropdown).toContain("id={panelId}");
    expect(dropdown).toContain("role={role}");
    expect(dropdown).toContain("useDismissable<HTMLDivElement>(open, close)");
    expect(read("components/profile-menu.tsx")).toContain('panelClassName="kit-popover-menu"');
    expect(read("components/help-menu.tsx")).toContain('role="dialog"');
  });

  it("borne la hauteur du menu BIOS sans altérer le thème de repli", () => {
    const start = css.indexOf("/* UI-06 — Popovers existants");
    const end = css.indexOf("/* UI-02 — unification", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const scoped = css.slice(start, end);
    const root = postcss.parse(scoped, { from: "styles/bios-glass-v31-components.css" });
    let rules = 0;
    root.walkRules((rule) => {
      rules++;
      expect(rule.selector.trim()).toMatch(/^html\[data-visual-profile="bios-glass-v31"\]/);
    });
    expect(rules).toBe(2);
    expect(scoped).toContain("max-height: calc(100dvh - var(--kit-topbar-h) - 24px)");
    expect(scoped).toContain("overflow-y: auto");
    expect(scoped).toContain("overflow-wrap: anywhere");
    expect(scoped).not.toContain("!important");
    expect(scoped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("préserve les invariants métier de la refonte", () => {
    const app = read("components/app-shell.tsx");
    const admin = read("components/admin-shell.tsx");
    const inbox = read("components/inbox/inbox-workbench.tsx");
    expect(app.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(admin.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(inbox.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(read("components/inbox/agent-ticket-table.tsx")).toContain("colSpan={7}");
  });
});
