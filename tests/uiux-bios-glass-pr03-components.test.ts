import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("styles/bios-glass-v31-components.css");
const globals = read("app/globals.css");
const tokens = read("styles/tokens.css");
const palette = read("styles/bios-glass-v31-preview.css");

function luminance(hex: string) {
  const channel = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return channel.reduce((acc, c, index) => {
    const v = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return acc + v * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}
function ratio(left: string, right: string) {
  const a = luminance(left), b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function composite(foreground: string, background: string, opacity: number) {
  return "#" + [1, 3, 5].map((offset) => {
    const front = Number.parseInt(foreground.slice(offset, offset + 2), 16);
    const back = Number.parseInt(background.slice(offset, offset + 2), 16);
    return Math.round(front * opacity + back * (1 - opacity)).toString(16).padStart(2, "0");
  }).join("");
}

describe("BIOS Glass v3.1 — PR 03 : composants partagés, opt-in et lisibilité", () => {
  it("conserve une feuille CSS valide, en dernier après la palette PR 02", () => {
    expect(() => postcss.parse(css, { from: "styles/bios-glass-v31-components.css" })).not.toThrow();
    expect(globals).toContain('@import "../styles/bios-glass-v31-preview.css";');
    expect(globals).toContain('@import "../styles/bios-glass-v31-components.css";');
    expect(globals.indexOf("bios-glass-v31-components.css")).toBeGreaterThan(globals.indexOf("bios-glass-v31-preview.css"));
    expect(css).toContain('html[data-visual-profile="bios-glass-v31"]');
    expect(css).toContain('html[data-visual-profile="bios-glass-v31"][data-theme]');
    expect(css).not.toContain(":root {");
  });

  it("applique rayons 6/10/12px et cartes verre translucides + blur 20px exclusivement en opt-in", () => {
    expect(css).toContain("--kit-radius-sm: 6px;");
    expect(css).toContain("--kit-radius-md: 6px;");
    expect(css).toContain("--kit-radius-lg: 10px;");
    expect(css).toContain("--kit-radius-xl: 12px;");
    expect(css).toContain("--bios-glass-card: rgb(255 255 255 / 72%);");
    expect(css).toContain("--bios-glass-menu: rgb(255 255 255 / 78%);");
    expect(css).toContain("--bios-glass-backdrop: blur(20px) saturate(150%);");
    expect(css).toContain("backdrop-filter: var(--bios-glass-backdrop);");
    expect(css).toContain(".kit-card,");
    expect(css).toContain(".ds-kpi-card,");
    expect(css).toContain(".kit-table-wrap,");
    expect(css).toContain(".kit-modal {");
    expect(css).toContain("--bios-glass-card: rgb(25 43 35 / 72%);");
    expect(tokens).toContain("--kit-radius-lg: 16px;");
    expect(tokens).toContain("--kit-primary: #C4510D;");
    expect(palette).toContain("--kit-primary: #E8702A;");
  });

  it("ne sacrifie pas la lisibilité à la transparence ni aux halos du canvas", () => {
    const onLight = composite("#FFFFFF", "#EEF0EC", 0.72);
    const warmHalo = composite("#FFFFFF", "#E9E6DE", 0.72);
    const onDark = composite("#192B23", "#101B18", 0.72);
    for (const surface of [onLight, warmHalo]) {
      expect(ratio("#14201D", surface)).toBeGreaterThanOrEqual(4.5);
      expect(ratio("#3A4744", surface)).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio("#F2F7F3", onDark)).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#CEDBD3", onDark)).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain("--bios-glass-raised: rgb(255 255 255 / 96%);");
    expect(css).toContain("--bios-glass-raised: rgb(25 43 35 / 97%);");
    expect(css).toContain("background: var(--bios-glass-raised);");
  });

  it("prévoit les états clavier, mobile et les alternatives à la transparence", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 2px solid var(--kit-primary);");
    expect(css).toContain("@supports not ((backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)))");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("background: var(--kit-card);");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("réutilise les primitives V1 au lieu de remplacer leurs actions", () => {
    const primitives = read("components/ui/primitives.tsx");
    const button = read("components/ui/button.tsx");
    const card = read("components/ui/card.tsx");
    const form = read("components/new-ticket-form.tsx");
    const shell = read("components/app-shell.tsx");
    const inbox = read("components/inbox/agent-ticket-table.tsx");
    expect(primitives).toContain("kit-btn kit-btn-");
    expect(primitives).toContain("kit-card");
    expect(button).toContain("kit-btn");
    expect(card).toContain("kit-card ds-card");
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain("confidentialRecipient");
    expect(shell.match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(inbox).toContain("colSpan={7}");
    expect(inbox).toContain("ClaimTicketButton");
    expect(read("app/layout.tsx")).toContain("allowVisualPreview ? <BiosGlassPreviewToggle /> : null");
  });
});
