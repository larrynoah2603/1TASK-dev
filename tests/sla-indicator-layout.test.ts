import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("SLA indicator layout", () => {
  it("keeps every SLA state in the same state + countdown hierarchy", () => {
    const indicator = source("components/sla-indicator.tsx");

    for (const label of [
      "SLA non configuré",
      "Dans les temps",
      "À surveiller",
      "Dépassement",
      "En pause",
      "Confirmation en attente",
      "Confirmation arrivée à échéance",
    ]) {
      expect(indicator).toContain(label);
    }

    expect(indicator).toContain('className="sla-indicator-copy"');
    expect(indicator).toContain('className="sla-indicator-label"');
    expect(indicator).toContain('className="sla-indicator-countdown"');
  });

  it("stacks compact state and countdown instead of allowing accidental wrapping", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain(".sla-indicator-compact .sla-indicator-head { display: grid;");
    expect(css).toContain(".sla-indicator-compact .sla-indicator-copy { display: grid;");
    expect(css).toContain(".sla-indicator-compact .sla-indicator-countdown { margin-left: 0;");
    expect(css).toContain("max-width: 12.5rem;");
  });
});
