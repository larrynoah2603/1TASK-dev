import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reporting SLA spacing", () => {
  it("scopes the spacing improvements to SLA supervision", () => {
    const component = source("components/dashboard-visuals.tsx");
    const css = source("styles/design-system.css");

    expect(component).toContain('dashboard-responsible-layout reporting-sla-oversight');
    expect(css).toContain(".reporting-sla-oversight {");
    expect(css).toContain("padding: var(--kit-space-5);");
    expect(css).toContain(".reporting-sla-oversight .dashboard-responsible-grid");
    expect(css).toContain(".reporting-sla-oversight .dashboard-escalations-widget");
    expect(css).toContain("@media (max-width: 767px)");
  });
});
