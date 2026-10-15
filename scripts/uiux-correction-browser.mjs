/** Reproducible component/public-page checks, NOT an authenticated V1 certification.
 * CHROME_BIN=/path/chromium PLAYWRIGHT_MODULE=/path/playwright/index.mjs \
 * node scripts/uiux-correction-browser.mjs --output=/absolute/evidence [--baseline]
 * Uses installed project dependencies, no DB, no auth mutation and no external API.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const root = process.cwd();
const output = resolve(process.argv.find(a => a.startsWith("--output="))?.slice(9) ?? "uiux-evidence");
const baseline = process.argv.includes("--baseline");
mkdirSync(output, { recursive: true });
const baselineRoot = process.argv.find(a => a.startsWith("--baseline-dir="))?.slice(15);
const before = (file) => baselineRoot ? readFileSync(join(baselineRoot, file), "utf8") : execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" });
const read = (file) => readFileSync(join(root, file), "utf8");
const source = (file) => baseline && ["components/status-badge.tsx", "styles/legacy.css", "styles/uupm-refonte.css", "styles/bios-glass-v31-preview.css", "styles/bios-glass-v31-components.css"].includes(file) ? before(file) : read(file);
const bundle = await build({ entryPoints: ["tests/fixtures/uiux-correction-components.tsx"], bundle: true, write: false,
  platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [{ name: "baseline-badge", setup(b) { if (baseline) b.onLoad({ filter: /components\/status-badge\.tsx$/ }, () => ({ contents: source("components/status-badge.tsx"), loader: "tsx" })); } }] });
const input = read("app/globals.css").replace(/@import "\.\.\/(styles\/[^"]+)";/g, (_, file) => source(file));
const css = (await postcss([tailwind({ base: root })]).process(input, { from: join(root, "app/globals.css") })).css;
const fontCss = ["@fontsource-variable/schibsted-grotesk/wght.css", "@fontsource-variable/ibm-plex-sans/wght.css", "@fontsource/ibm-plex-mono/latin-400.css", "@fontsource/ibm-plex-mono/latin-600.css", "@fontsource/ibm-plex-mono/latin-700.css"].map(p => {
  const folder = p.slice(0, p.lastIndexOf("/"));
  return read("node_modules/" + p).replaceAll("./files/", `/node_modules/${folder}/files/`);
}).join("\n");
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/node_modules/") && path.endsWith(".woff2") && !path.includes("..")) {
    const file = join(root, path.slice(1)); if (existsSync(file)) { res.setHeader("Content-Type", "font/woff2"); res.end(readFileSync(file)); return; }
  }
  if (path === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); return; }
  if (path === "/styles.css") { res.setHeader("Content-Type", "text/css"); res.end(fontCss + css); return; }
  if (path !== "/") { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end('<!doctype html><html lang="fr" data-theme="light" data-visual-profile="bios-glass-v31"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Recette de composants 1TASK — données fictives</title><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(ok => server.listen(4173, "127.0.0.1", ok));
const playwright = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let app;
const results = { scope: "Real isolated components + public signin; authenticated journeys NOT tested", baseline, checks: [], errors: [] };
try {
  const page = await browser.newPage();
  page.on("pageerror", e => results.errors.push(e.message));
  await page.route("**/api/**", route => route.abort());
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.locator(".agent-ticket-row").first().waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(t => document.documentElement.dataset.theme = t, theme); await page.waitForTimeout(350);
      const check = await page.evaluate(() => {
        const style = e => { const s = getComputedStyle(e); return { background: s.backgroundColor, border: s.borderTopStyle, borderWidth: s.borderTopWidth, color: s.color, radius: s.borderRadius, font: s.fontFamily, size: s.fontSize }; };
        return { scope: "components", theme: document.documentElement.dataset.theme, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          profile: document.documentElement.dataset.visualProfile, bodyFont: getComputedStyle(document.body).fontFamily,
          headingFont: getComputedStyle(document.querySelector("h1")).fontFamily, fontsLoaded: document.fonts.check('14px "Schibsted Grotesk Variable"'),
          badges: [...document.querySelectorAll("[data-priority]")].map(e => ({ priority: e.dataset.priority,
            styles: [...e.querySelectorAll("[data-case]")].map(c => style([...c.querySelectorAll(".kit-badge")].find(b => !b.querySelector(".kit-badge-dot")))) })),
          tab: style(document.querySelector(".dashboard-view-tab")), activeTab: style(document.querySelector(".dashboard-view-tab.is-active")), summary: style(document.querySelector(".ticket-wizard-summary")),
          referenceFont: getComputedStyle(document.querySelector(".agent-ticket-reference")).fontFamily };
      });
      results.checks.push(check);
      if (!baseline) {
        assert.equal(check.profile, "bios-glass-v31");
        assert.equal(check.fontsLoaded, true); assert.match(check.bodyFont, /Schibsted Grotesk/); assert.match(check.headingFont, /Schibsted Grotesk/);
        assert.match(check.referenceFont, /IBM Plex Mono/);
        assert.ok(check.scrollWidth <= width + 1, `Component overflow ${theme} ${width}: ${check.scrollWidth}`);
        for (const badge of check.badges) { assert.equal(badge.styles[0].border, "solid"); assert.equal(badge.styles[0].borderWidth, "1px"); for (const s of badge.styles) assert.deepEqual(s, badge.styles[0], `Badge inconsistent: ${badge.priority}`); }
      }
      if ([375, 1440].includes(width)) {
        await page.screenshot({ path: join(output, `components-${theme}-${width}.png`), fullPage: false, animations: "disabled" });
        await page.locator('[aria-label="Variantes indépendantes"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(350);
        await page.screenshot({ path: join(output, `variants-${theme}-${width}.png`), fullPage: false, animations: "disabled" });
        await page.evaluate(() => scrollTo(0, 0));
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  const row = page.locator(".agent-ticket-row").first(); await row.focus(); await page.keyboard.press("Enter");
  assert.equal(await row.getAttribute("aria-expanded"), "true");
  const expanded = page.locator(".agent-ticket-expanded-row td:visible");
  assert.equal(await expanded.getAttribute("colspan"), "7");
  await expanded.getByRole("button", { name: "Prendre en charge", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  if (!baseline) await page.screenshot({ path: join(output, "claim-dialog-dark-1440.png"), animations: "disabled" });
  await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
  const returnedFocus = await page.evaluate(() => document.activeElement?.textContent);
  assert.match(returnedFocus, /Prendre en charge/);
  results.interaction = { keyboardExpansion: true, colSpan7: true, claimDialogVisible: true, escapeAndFocusReturn: true, claimMutation: "NOT_EXECUTED" };
  if (!baseline) {
    await page.screenshot({ path: join(output, "components-details-dark-1440.png"), fullPage: false, animations: "disabled" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const duration = await page.locator(".dashboard-view-tab").first().evaluate(e => getComputedStyle(e).transitionDuration);
    assert.ok(duration.split(",").every(d => parseFloat(d) < .001)); results.reducedMotion = duration;
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => delete document.documentElement.dataset.visualProfile);
    results.historicalBodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    assert.match(results.historicalBodyFont, /IBM Plex Sans/);
    await page.evaluate(() => document.documentElement.dataset.visualProfile = "bios-glass-v31");
    app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
      cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", PRODUCT_PROFILE: "v1", VERCEL_ENV: "preview",
        DATABASE_URL: "postgresql://uiux_test:local_only@127.0.0.1:5432/uiux_unavailable", NEXTAUTH_URL: "http://localhost:3000", NEXTAUTH_SECRET: "local-uiux-fixture-only-not-for-deployment" }, stdio: ["ignore", "pipe", "pipe"] });
    let log = ""; app.stdout.on("data", b => log += b); app.stderr.on("data", b => log += b);
    for (let i = 0; i < 80; i++) { if (log.includes("Ready")) break; if (app.exitCode !== null) throw Error(log); await new Promise(r => setTimeout(r, 250)); }
    await page.addInitScript(() => { sessionStorage.setItem("1task-bios-glass-preview", "on"); localStorage.setItem("1task-theme", "light"); });
    await page.goto("http://127.0.0.1:3000/signin", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ["light", "dark"]) for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 }); await page.evaluate(t => document.documentElement.dataset.theme = t, theme); await page.waitForTimeout(350);
      const check = await page.evaluate(() => ({ scope: "signin", width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        theme: document.documentElement.dataset.theme, profile: document.documentElement.dataset.visualProfile, bodyFont: getComputedStyle(document.body).fontFamily }));
      results.checks.push(check); assert.equal(check.profile, "bios-glass-v31"); assert.match(check.bodyFont, /Schibsted Grotesk/); assert.ok(check.scrollWidth <= width + 1);
      if ([375, 1440].includes(width)) await page.screenshot({ path: join(output, `signin-${theme}-${width}.png`), fullPage: false, animations: "disabled" });
    }
    await page.goto("http://127.0.0.1:3000/signin?error=AccessDenied", { waitUntil: "networkidle" });
    assert.ok(await page.getByText("L’accès est refusé pour ce compte.").isVisible()); results.signinErrorState = true;
    writeFileSync(join(output, "next-dev.log"), log);
  }
  assert.deepEqual(results.errors, []);
  results.status = "PASS_WITH_AUTHENTICATED_SCOPE_EXCLUDED";
} catch (error) { results.status = "FAIL"; results.failure = error.stack; process.exitCode = 1; }
finally { writeFileSync(join(output, "browser-results.json"), JSON.stringify(results, null, 2)); await browser.close(); server.close(); app?.kill("SIGTERM"); }
console.log(JSON.stringify({ status: results.status, checks: results.checks.length, failure: results.failure }));
