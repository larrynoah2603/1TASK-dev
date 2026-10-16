import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// @ts-ignore -- dependency-free Node ESM scanner, not a TypeScript library.
import { DEFAULT_WIDTHS, parseArgs } from "@/scripts/ui05-browser-audit.mjs";

const scanner = resolve("scripts/ui05-browser-audit.mjs");
const fixture = resolve("tests/fixtures/ui05-visual-audit.html");
const browser = [process.env.CHROME_BIN, "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .find((path) => path && existsSync(path));
// System Chromium can hang before exposing CDP in CI. Keep this expensive,
// environment-sensitive evidence check opt-in, like the computed-style audit.
const browserChecksEnabled = process.env.RUN_BIOS_BROWSER_TESTS === "1" && Boolean(browser);

describe("UI-05 — collecte des preuves réelles de rendu sans altérer 1TASK", () => {
  it("reprend précisément les sept largeurs acceptées en UI-01", () => {
    expect(DEFAULT_WIDTHS).toEqual([320, 375, 390, 768, 1024, 1280, 1440]);
    const args = parseArgs(["--url=https://1-task-dev.vercel.app/signin"]);
    expect(args.widths).toEqual(DEFAULT_WIDTHS);
    expect(args.themes).toEqual(["light", "dark"]);
    expect(args.screenshots).toBeUndefined();
  });

  it("n'accepte ni URL HTTP distante ni navigateur CDP exposé sur une IP distante", () => {
    expect(() => parseArgs(["--url=http://some-remote.example/signin"])).toThrow();
    expect(() => parseArgs(["--url=https://1-task-dev.vercel.app/inbox", "--cdp=http://10.0.0.1:9222"])).toThrow();
    expect(() => parseArgs(["--url=javascript:alert(1)"])).toThrow();
    expect(() => parseArgs(["--url=about:blank"])).toThrow();
  });

  it("ne contourne jamais Entra et garde les captures privées désactivées par défaut", () => {
    const source = readFileSync(scanner, "utf8");
    expect(source).toContain("NOT_AUTHENTICATED_OR_REDIRECTED");
    expect(source).toContain("Page.navigate");
    expect(source).toContain("Page.captureScreenshot");
    expect(source).toContain("if (options.screenshots)");
    expect(source).not.toContain("NEXTAUTH_SECRET");
    expect(source).not.toContain("localStorage.setItem");
    expect(source).not.toContain("document.cookie");
    expect(source).not.toContain("disable-web-security");
  });

  it("n'enregistre pas les identifiants de ticket dans le rapport ou les noms d'images", () => {
    const source = readFileSync(scanner, "utf8");
    expect(source).not.toContain("actualPath:");
    expect(source).not.toContain("urlPath:");
    expect(source).toContain('"UI05-" + width + "-" + theme + ".png"');
    expect(source).toContain("No route IDs or names in filenames");
  });

  it("protège les anciennes actions V1, sans ajouter de bouton ni de filtre", () => {
    const read = (p: string) => readFileSync(resolve(p), "utf8");
    expect(read("components/app-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(read("components/admin-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(read("components/inbox/inbox-workbench.tsx").match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(read("components/inbox/agent-ticket-table.tsx")).toContain("colSpan={7}");
  });

  it.skipIf(!browserChecksEnabled)("détecte une violation de contraste et un débordement dans une vraie page Chromium fictive", () => {
    const run = spawnSync(process.execPath, [
      scanner, "--fixture=" + fixture, "--widths=390", "--themes=light",
    ], { encoding: "utf8", timeout: 18000, env: { ...process.env, CHROME_BIN: browser } });
    expect(run.status, run.stderr).toBe(0);
    const report = JSON.parse(run.stdout);
    expect(report.origin).toBe("offline-fixture");
    expect(report.screenshots).toBe(false);
    expect(report.results).toHaveLength(1);
    const result = report.results[0];
    expect(result.status).toBe("MEASURED");
    expect(result.width).toBe(390);
    expect(result.viewport).toBe(390);
    expect(result.horizontalOverflow).toBe(true);
    expect(result.overflowingNodes).toContain("div.overflow");
    expect(result.contrastFindings.some((v: { ratio: number; min: number }) => v.ratio < v.min)).toBe(true);
  }, 20000);
});
