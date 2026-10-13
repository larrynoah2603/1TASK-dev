import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("global typography", () => {
  it("self-hosts the approved families with versioned, integrity-checked NPM packages", () => {
    const layout = source("app/layout.tsx");
    const globals = source("app/globals.css");
    const packageJson = JSON.parse(source("package.json"));
    const lock = JSON.parse(source("package-lock.json"));

    expect(layout).not.toContain("next/font/google");
    expect(layout).toContain('@fontsource-variable/ibm-plex-sans/wght.css');
    expect(layout).toContain('@fontsource-variable/schibsted-grotesk/wght.css');
    for (const weight of [400, 600, 700]) {
      expect(layout).toContain(`@fontsource/ibm-plex-mono/latin-${weight}.css`);
    }
    for (const [token, family] of [
      ["ibm-plex-sans", "IBM Plex Sans Variable"],
      ["schibsted-grotesk", "Schibsted Grotesk Variable"],
      ["ibm-plex-mono", "IBM Plex Mono"],
    ]) expect(globals).toContain(`--font-${token}: "${family}";`);
    for (const name of [
      "@fontsource-variable/ibm-plex-sans",
      "@fontsource-variable/schibsted-grotesk",
      "@fontsource/ibm-plex-mono",
    ]) {
      expect(packageJson.dependencies[name]).toBe("5.3.0");
      expect(lock.packages[""].dependencies[name]).toBe("5.3.0");
      expect(lock.packages[`node_modules/${name}`].integrity).toMatch(/^sha512-/);
    }
  });

  it("uses IBM Plex Sans as the design-system font token with safe fallbacks", () => {
    const tokens = source("styles/tokens.css");

    expect(tokens).toContain(
      '--kit-font: var(--font-ibm-plex-sans), "IBM Plex Sans", ui-sans-serif, system-ui',
    );
    expect(tokens).not.toContain(
      '--kit-font: Inter, ui-sans-serif',
    );
  });

  it("keeps the shared body typography wired to the design-system token", () => {
    const bridge = source("styles/legacy-bridge.css");
    const designSystem = source("styles/design-system.css");

    expect(bridge).toContain("font-family: var(--kit-font)");
    expect(designSystem).toContain("font-family: var(--kit-font)");
  });
});
