import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("dynamic routing keyword help", () => {
  it("reads live keywords from active catalog services instead of hardcoding them", () => {
    const route = source("app/api/help/routing-keywords/route.ts");

    expect(route).toContain("requireSessionUserContext()");
    expect(route).toContain("prisma.serviceCatalogItem.findMany");
    expect(route).toContain("keywords: true");
    expect(route).toContain("isActive: true");
    expect(route).toContain('startsWith("TRIAGE-")');
    expect(route).toContain("globalTriageServiceId");
    expect(route).toContain('"Cache-Control": "private, no-store"');
  });

  it("returns only the minimal routing destination needed by help", () => {
    const route = source("app/api/help/routing-keywords/route.ts");

    expect(route).toContain("department: service.queue.department");
    expect(route).toContain("queue: { id: service.queue.id, name: service.queue.name }");
    expect(route).toContain("keywords: [...new Set");
    expect(route).not.toContain("confidentialPrimaryRecipient");
    expect(route).not.toContain("confidentialDelegations");
  });

  it("offers a searchable keyword view grouped by department", () => {
    const help = source("components/help-menu.tsx");

    expect(help).toContain('fetch("/api/help/routing-keywords"');
    expect(help).toContain("Mots-clés de routage");
    expect(help).toContain("Destination probable");
    expect(help).toContain("entry.department.name");
    expect(help).toContain("entry.queue.name");
    expect(help).toContain("entry.keywords.map");
    expect(help).toContain("normalizeSearch");
  });

  it("explains that keyword routing is indicative rather than guaranteed", () => {
    const help = source("components/help-menu.tsx");

    expect(help).toContain("destination probable");
    expect(help).toContain("le routage tient compte de l’ensemble de votre demande");
  });

  it("keeps the routing help theme-aware and scrollable", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain(".kit-help-routing");
    expect(css).toContain(".kit-help-search");
    expect(css).toContain(".kit-help-keywords");
    expect(css).toContain(".kit-help-destination");
    expect(css).toContain("background: var(--kit-primary-soft)");
    expect(css).toContain("background: var(--kit-surface)");
  });
});
