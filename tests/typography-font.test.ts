import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("global typography", () => {
  it("loads IBM Plex Sans through next/font with the application weights", () => {
    const layout = source("app/layout.tsx");

    expect(layout).toContain('import { IBM_Plex_Sans } from "next/font/google"');
    expect(layout).toContain("IBM_Plex_Sans({");
    expect(layout).toContain('weight: ["400", "500", "600", "700"]');
    expect(layout).toContain('display: "swap"');
    expect(layout).toContain('variable: "--font-ibm-plex-sans"');
    expect(layout).toContain("className={ibmPlexSans.variable}");
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
