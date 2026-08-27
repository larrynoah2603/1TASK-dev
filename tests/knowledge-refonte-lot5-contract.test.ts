import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("lot 5 knowledge industrial visual contract", () => {
  it("keeps knowledge access controls and scoped department loading", () => {
    const page = source("app/(app)/knowledge/page.tsx");

    expect(page).toContain('permissions.includes("knowledge:manage")');
    expect(page).toContain('permissions.includes("knowledge:read")');
    expect(page).toContain("listKnowledgeArticles(user)");
    expect(page).toContain("RoleCode.FUNCTIONAL_ADMIN");
    expect(page).toContain("knowledge-industrial");
  });

  it("keeps all article workflow transitions and mutation endpoints", () => {
    const component = source("components/knowledge-list-client.tsx");

    expect(component).toContain('DRAFT: ["REVIEW", "ARCHIVED"]');
    expect(component).toContain('REVIEW: ["PUBLISHED", "ARCHIVED", "DRAFT"]');
    expect(component).toContain('PUBLISHED: ["REVIEW", "ARCHIVED"]');
    expect(component).toContain('ARCHIVED: ["DRAFT"]');
    expect(component).toContain("fetch(`/api/knowledge/${articleId}`");
    expect(component).toContain('fetch("/api/knowledge"');
    expect(component).toContain("knowledge-library-grid");
  });

  it("contains a scoped lot 5 palette without new blue or violet accents", () => {
    const css = source("app/globals.css");
    const lotFive = css.slice(css.indexOf("Lot 5 — base de connaissances industrielle"));

    expect(lotFive).toContain(".knowledge-industrial");
    expect(lotFive).toContain(".knowledge-library-grid");
    expect(lotFive).not.toMatch(/blue|cyan|indigo|violet|#4c4dba|#5b5bd6/i);
  });
});
