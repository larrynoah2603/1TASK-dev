import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("styles/bios-glass-v31-preview.css");
const layout = read("app/layout.tsx");
const globals = read("app/globals.css");
const toggle = read("components/uiux/bios-glass-preview-toggle.tsx");
const legacy = read("styles/tokens.css");

function channels(hex: string) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}
function luminance(color: number[]) {
  return color.reduce((sum, value, index) => {
    const component = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return sum + component * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}
function ratio(a: number[], b: number[]) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function hex(source: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`--kit-${escaped}: (#[0-9a-fA-F]{6});`));
  expect(match, `missing token ${token}`).not.toBeNull();
  return channels(match![1]);
}
const darkAt = 'html[data-visual-profile="bios-glass-v31"][data-theme="dark"]';
const light = css.slice(0, css.indexOf(darkAt));
const dark = css.slice(css.indexOf(darkAt), css.indexOf("/* Le corps garde"));

describe("BIOS Glass v3.1 — PR 02 : couleurs, fontes et activation isolée", () => {
  it("préserve les tokens historiques et les contrats CSS consommés par V1", () => {
    expect(legacy).toContain("--kit-brand: #EA7C29;");
    expect(legacy).toContain("--kit-primary: #C4510D;");
    expect(legacy).toContain("--kit-bg: #F8F9FB;");
    expect(globals).toContain('@import "../styles/legacy-bridge.css";');
    expect(globals).toContain('@import "../styles/bios-glass-v31-preview.css";');
    expect(globals.indexOf('bios-glass-v31-preview.css')).toBeGreaterThan(globals.indexOf('v1-visual-finish.css'));
    expect(css).toContain('html[data-visual-profile="bios-glass-v31"]');
    expect(css).toContain(darkAt);
    expect(css).not.toContain(":root {");
  });

  it("active le basculement seulement en développement ou sur Vercel Preview", () => {
    expect(layout).toContain('process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development"');
    expect(layout).toContain("allowVisualPreview ? <BiosGlassPreviewToggle /> : null");
    expect(layout).not.toContain("next/font/google");
    expect(globals).toContain('--font-ibm-plex-sans: "IBM Plex Sans Variable";');
    expect(toggle).toContain('window.sessionStorage.getItem(STORAGE_KEY)');
    expect(toggle).toContain('window.sessionStorage.setItem(STORAGE_KEY');
    expect(toggle).toContain("delete document.documentElement.dataset.visualProfile");
    expect(toggle).toContain("aria-pressed={enabled}");
    expect(toggle).not.toContain("localStorage");
    expect(toggle).not.toContain("fetch(");
  });

  it("prévisualise les fontes du guide sans supprimer IBM Plex Sans du corps", () => {
    expect(layout).toContain('@fontsource-variable/schibsted-grotesk/wght.css');
    expect(layout).toContain('@fontsource/ibm-plex-mono/latin-700.css');
    expect(layout).toContain('@fontsource-variable/ibm-plex-sans/wght.css');
    expect(globals).toContain('--font-schibsted-grotesk: "Schibsted Grotesk Variable";');
    expect(globals).toContain('--font-ibm-plex-mono: "IBM Plex Mono";');
    expect(css).toContain("--kit-font-display: var(--font-schibsted-grotesk)");
    expect(css).toContain("--kit-font-mono: var(--font-ibm-plex-mono)");
    expect(css).toContain("font-family: var(--kit-font-display)");
    expect(css).toContain("font-family: var(--kit-font-mono)");
  });

  it("applique exactement les couleurs BIOS de marque et conserve un fond sombre séparé", () => {
    expect(light).toContain("--kit-brand: #E8702A;");
    expect(light).toContain("--kit-primary: #E8702A;");
    expect(light).toContain("--kit-bg: #EEF0EC;");
    expect(light).toContain("--kit-text: #14201D;");
    expect(light).toContain("--kit-border: #E2E5E2;");
    expect(light).toContain("--kit-success: #1F7A55;");
    expect(light).toContain("--kit-danger: #B42323;");
    expect(light).toContain("--kit-warning: #93590A;");
    expect(light).toContain("--kit-info: #1F5FAE;");
    expect(dark).toContain("--kit-bg: #101B18;");
    expect(dark).toContain("--kit-text: #F2F7F3;");
  });

  it.each(["light", "dark"] as const)("assure au moins 4.5:1 aux couleurs principales et badges en %s", (theme) => {
    const block = theme === "light" ? light : dark;
    const text = hex(block, "text"), card = hex(block, "card");
    const bg = hex(block, "bg");
    expect(ratio(text, bg), `${theme} text/canvas`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(text, card), `${theme} text/card`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(hex(block, "on-primary"), hex(block, "primary")), `${theme} action`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(hex(block, "on-primary"), hex(block, "primary-hover")), `${theme} hover`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(hex(block, "primary-text"), card), `${theme} link`).toBeGreaterThanOrEqual(4.5);
    for (const [name, opacity] of [["success", 0.08], ["danger", 0.14], ["warning", 0.16], ["info", 0.14]] as const) {
      const accent = hex(block, name);
      const mix = accent.map((v, i) => opacity * v + (1 - opacity) * card[i]);
      expect(ratio(hex(block, `${name}-text`), mix), `${theme} ${name} badge`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("ne touche ni aux routes, ni aux CTA globaux, ni aux règles de notification V1", () => {
    const shell = read("components/app-shell.tsx");
    const admin = read("components/admin-shell.tsx");
    const form = read("components/new-ticket-form.tsx");
    const inbox = read("components/inbox/inbox-workbench.tsx");
    expect(shell.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(admin.split("<NewTicketLauncher")).toHaveLength(2);
    expect(inbox.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain("confidentialRecipient");
    expect(read("lib/product-policy.ts")).toContain("pushNotifications");
  });
});
