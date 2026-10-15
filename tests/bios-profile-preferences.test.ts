import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";
import { DensityToggle } from "@/components/density-toggle";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("BIOS 1Time-inspired shell / preferences, without V1 changes", () => {
  it("renders actual three-way theme and two-way density controls, with active state", () => {
    const theme = renderToStaticMarkup(React.createElement(ThemeToggle, { variant: "segmented" }));
    const density = renderToStaticMarkup(React.createElement(DensityToggle));
    expect(theme).toContain("Auto");
    expect(theme).toContain("Clair");
    expect(theme).toContain("Sombre");
    expect(theme.match(/aria-pressed=/g)).toHaveLength(3);
    expect(density).toContain("Normale");
    expect(density).toContain("Compacte");
    expect(density.match(/aria-pressed=/g)).toHaveLength(2);
    expect(read("components/profile-menu.tsx")).toContain('role="dialog"');
  });

  it("persists Auto theme, applies OS media changes and restores density before paint", () => {
    const theme = read("components/theme-toggle.tsx");
    const density = read("components/density-toggle.tsx");
    const layout = read("app/layout.tsx");
    expect(theme).toContain('"(prefers-color-scheme: dark)"');
    expect(theme).toContain('media.addEventListener("change", sync)');
    expect(theme).toContain('window.localStorage.setItem("1task-theme", preference)');
    expect(layout).toContain("p==='auto'");
    expect(layout).toContain("document.documentElement.dataset.theme");
    expect(density).toContain('window.localStorage.setItem("1task-density", next)');
    expect(layout).toContain("document.documentElement.dataset.density");
    expect(read("components/ui/dropdown.tsx")).toContain("triggerRef.current?.focus()");
  });

  it("centres only the desktop collapse control, keeping the V1 sidebar layout", () => {
    const shell = read("styles/bios-glass-v31-shell-v1.css");
    const sheet = postcss.parse(shell);
    const target: Record<string, string> = {};
    sheet.walkRules((rule) => {
      if (rule.selector.endsWith(" .kit-sidebar-toggle")
          && !rule.selector.includes('data-sidebar-collapsed="true"')
          && rule.parent?.type === "atrule"
          && "params" in rule.parent && rule.parent.params.includes("min-width: 1024px")) {
        rule.walkDecls((declaration) => { target[declaration.prop] = declaration.value; });
      }
    });
    expect(target.top).toBe("calc(var(--kit-topbar-h) / 2)");
    expect(target.right).toBe("12px");
    expect(target.transform).toBe("translateY(-50%)");
    expect(target.width).toBe("28px");
    expect(target.height).toBe("28px");
    expect(shell).toContain('[data-sidebar-collapsed="true"] .kit-sidebar-toggle {');
    expect(shell).toContain("--kit-sidebar-w: 240px;");
    expect(shell).toContain("--kit-sidebar-w-collapsed: 64px;");
    expect(shell).toContain("--kit-topbar-h: 56px;");
    expect(read("styles/design-system.css")).toContain(".kit-sidebar-toggle { display: none; }");
    const app = read("components/app-shell.tsx");
    expect(app.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(read("components/inbox/agent-ticket-table.tsx")).toContain("colSpan={7}");
  });

  it("has real light/dark glass, semantic density and accessible opaque fallbacks", () => {
    const css = read("styles/bios-glass-v31-components.css");
    expect(() => postcss.parse(css)).not.toThrow();
    expect(css).toContain('html[data-visual-profile="bios-glass-v31"][data-theme] .kit-popover');
    expect(css).toContain("background: var(--bios-glass-menu);");
    // An earlier !important on .kit-popover-menu previously forced a 96% opaque
    // edit surface; the 82% menu token must be free to win.
    const importantMenuBackgrounds: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selector.includes(".kit-popover-menu")) return;
      rule.walkDecls("background", (decl) => {
        if (decl.important) importantMenuBackgrounds.push(decl.value);
      });
    });
    expect(importantMenuBackgrounds).toHaveLength(0);
    expect(css).toContain('data-density="compact"');
    expect(css).toContain("padding-block: 8px;");
    expect(css).toContain("background: var(--kit-card);");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    const colors = read("styles/bios-glass-v31-components.css");
    expect(colors).toContain("--bios-glass-card: rgb(255 255 255 / 62%);");
    expect(colors).toContain("--bios-glass-card: rgb(25 43 35 / 85%);");
    // Preserve the transparent table wrappers introduced by the prior fix.
    expect(read("styles/uupm-refonte.css")).toContain("background: transparent !important;");
  });
});
