import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("correctif densité et thème industriel", () => {
  it("préserve le défilement mobile tout en supprimant les scrollbars internes inutiles", () => {
    expect(css).toContain(".view-switcher::-webkit-scrollbar");
    expect(css).toContain(".ticket-comment-list");
    expect(css).toContain("overflow-y: visible !important");
    expect(css).toContain("@media (min-width: 761px)");
  });

  it("définit un mode clair industriel contrasté sans altérer les contrôles métier", () => {
    expect(css).toContain('html[data-theme="light"] .shell-industrial');
    expect(css).toContain("--industrial-panel: #FCFAF1");
    expect(css).toContain("--industrial-rail: #343434");
    expect(css).toContain(".dashboard-operation-table");
  });
});
