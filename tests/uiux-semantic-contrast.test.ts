import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "styles/tokens.css"), "utf8");

function rgb(hex: string) {
  const digits = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16) / 255);
}
function luminance(channels: number[]) {
  const weights = [0.2126, 0.7152, 0.0722];
  return channels.reduce((acc, x, i) => {
    const linear = x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    return acc + weights[i] * linear;
  }, 0);
}
function contrast(a: number[], b: number[]) {
  const left = luminance(a);
  const right = luminance(b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}
function hexToken(theme: string, name: string) {
  const match = theme.match(new RegExp(`--kit-${name}: (#[0-9a-fA-F]{6});`));
  expect(match, `token ${name}`).not.toBeNull();
  return rgb(match![1]);
}

describe("Contraste des statuts BIOS / 1TASK (WCAG AA)", () => {
  const light = css.split('html[data-theme="dark"]')[0];
  const dark = css.split('html[data-theme="dark"]')[1].split("/* Teintes calculées")[0];

  it.each(["light", "dark"] as const)("assure 4.5:1 aux badges info, succès, attention et erreur en thème %s", (mode) => {
    const theme = mode === "light" ? light : dark;
    const card = hexToken(theme, "card");
    for (const state of ["info", "success", "warning", "danger"]) {
      const text = hexToken(theme, `${state}-text`);
      const color = hexToken(theme, state);
      const match = css.match(new RegExp(`--kit-${state}-soft: color-mix\\(in srgb, var\\(--kit-${state}\\) (\\d+)%, var\\(--kit-card\\)\\);`));
      expect(match, `mix ${state}`).not.toBeNull();
      const percent = Number(match![1]) / 100;
      const backdrop = card.map((value, i) => value * (1 - percent) + color[i] * percent);
      expect(contrast(text, backdrop), `${mode} ${state}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("conserve le contraste de l'action principale en clair/sombre et les couleurs de marque", () => {
    expect(contrast(hexToken(light, "on-primary"), hexToken(light, "primary"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hexToken(dark, "on-primary"), hexToken(dark, "primary"))).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain("--kit-brand: #EA7C29;");
    expect(css).toContain("--kit-primary: #C4510D;");
  });
});
