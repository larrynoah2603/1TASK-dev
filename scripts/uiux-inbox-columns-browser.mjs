/** Container-aware Inbox component checks, NOT an authenticated V1 certification.
 * CHROME_BIN=/path/chromium PLAYWRIGHT_MODULE=/path/playwright/index.mjs \
 * node scripts/uiux-inbox-columns-browser.mjs --output=/absolute/evidence [--baseline]
 * Uses installed project dependencies, no DB, no auth mutation and no external API.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
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
const source = (file) => baseline && ["components/status-badge.tsx", "styles/legacy.css", "styles/uupm-refonte.css", "styles/bios-glass-v31-preview.css", "styles/bios-glass-v31-components.css", "styles/design-system.css", "components/inbox/agent-ticket-table.tsx"].includes(file) ? before(file) : read(file);
const bundle = await build({ entryPoints: ["tests/fixtures/uiux-inbox-columns.tsx"], bundle: true, write: false,
  platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [{ name: "baseline-badge", setup(b) { if (baseline) b.onLoad({ filter: /components\/inbox\/agent-ticket-table\.tsx$/ }, () => ({ contents: source("components/inbox/agent-ticket-table.tsx"), loader: "tsx" })); } }] });
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
const results = { baseline, scope: "Real AgentTicketTable, synthetic data; no authenticated journey", checks: [], errors: [] };
try {
  const page = await browser.newPage();
  page.on("pageerror", e => results.errors.push(e.message));
  await page.route("**/api/**", route => route.abort());
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.locator(".agent-ticket-row").first().waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  const cases = [320, 375, 390, 768, 1024, 1280, 1440, 1920].map(width => ({ width, container: null, inbox: true }));
  for (const container of [640, 699, 700, 900, 1100, 1449, 1450, 1520]) cases.push({ width: 1700, container, inbox: true });
  cases.push({ width: 1440, container: 1100, inbox: false });
  for (const theme of ["light", "dark"]) for (const test of cases) {
    await page.setViewportSize({ width: test.width, height: 960 });
    await page.evaluate(({ theme, test }) => {
      document.documentElement.dataset.theme = theme;
      document.querySelector(".inbox-workbench").parentElement.classList.toggle("inbox-v2", test.inbox);
      document.querySelector(".agent-ticket-workspace").style.width = test.container ? `${test.container}px` : "";
    }, { theme, test });
    await page.waitForTimeout(250);
    const check = await page.evaluate(() => {
      const visible = e => e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0;
      const refs = [...document.querySelectorAll(".agent-ticket-reference")].filter(visible);
      const titles = [...document.querySelectorAll(".agent-ticket-title")].filter(visible);
      return { theme: document.documentElement.dataset.theme, viewport: innerWidth,
        profile: document.documentElement.dataset.visualProfile,
        container: document.querySelector(".agent-ticket-workspace").getBoundingClientRect().width,
        pageWidth: document.documentElement.scrollWidth,
        columns: [...document.querySelectorAll("thead th")].filter(visible).length,
        cards: getComputedStyle(document.querySelector(".agent-ticket-mobile-list")).display !== "none",
        references: refs.map(e => ({ text: e.textContent, width: e.clientWidth, scroll: e.scrollWidth,
          height: e.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(e).lineHeight), nowrap: getComputedStyle(e).whiteSpace })),
        titles: titles.map(e => ({ height: e.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(e).lineHeight), clamp: getComputedStyle(e).webkitLineClamp })),
        overflowingCells: [...document.querySelectorAll("tbody td")].filter(e => visible(e) && e.scrollWidth > e.clientWidth + 1).length,
        subjectWidth: document.querySelector("th.agent-ticket-col-subject")?.getBoundingClientRect().width ?? 0 };
    });
    results.checks.push({ ...test, ...check });
    if (!baseline) {
      assert.equal(check.profile, "bios-glass-v31");
      assert.ok(check.pageWidth <= test.width + 1, `Page overflow ${theme} ${JSON.stringify(test)}`);
      const expected = check.container < 700 ? 0 : check.container < (test.inbox ? 1450 : 1100) ? 4 : 7;
      assert.equal(check.columns, expected); assert.equal(check.cards, expected === 0);
      assert.equal(check.overflowingCells, 0, `Cell overflow ${JSON.stringify(check)}`);
      for (const ref of check.references) { assert.equal(ref.nowrap, "nowrap"); assert.ok(ref.scroll <= ref.width + 1, `Reference clipped ${JSON.stringify(ref)}`); assert.ok(ref.height <= ref.lineHeight + 1); }
      for (const title of check.titles) { assert.equal(title.clamp, "2"); assert.ok(title.height <= title.lineHeight * 2 + 1); }
      if (expected === 7) assert.ok(check.subjectWidth >= 180);
    }
    if (test.container === null && [375, 1440, 1920].includes(test.width)) await page.locator(".agent-ticket-workspace").screenshot({ path: join(output, `inbox-${theme}-${test.width}.png`), animations: "disabled" });
  }
  if (!baseline) {
    // Keyboard access to full title/date in both existing table modes.
    for (const container of [900, 1520]) {
      await page.setViewportSize({ width: 1700, height: 960 });
      await page.evaluate(size => {
        document.querySelector(".inbox-workbench").parentElement.classList.add("inbox-v2");
        document.querySelector(".agent-ticket-workspace").style.width = `${size}px`;
      }, container);
      const row = page.locator(".agent-ticket-row").nth(2); await row.focus(); await page.keyboard.press("Enter");
      const detail = page.locator(".agent-ticket-expanded-row td:visible");
      assert.equal(await detail.getAttribute("colspan"), container < 1450 ? "4" : "7");
      const title = detail.locator("h3");
      assert.match(await title.textContent(), /prochaine réunion de l’équipe de support/);
      assert.equal(await title.evaluate(e => getComputedStyle(e).whiteSpace), "normal");
      assert.ok(await detail.locator("time").isVisible());
      assert.match(await detail.locator("time").textContent(), /2026/);
      await page.locator(".agent-ticket-workspace").screenshot({ path: join(output, `details-dark-container-${container}.png`), animations: "disabled" });
      await detail.getByRole("button", { name: "Réduire", exact: true }).click();
    }
    const first = page.locator(".agent-ticket-row").first(); await first.focus(); await page.keyboard.press("Enter");
    await page.locator(".agent-ticket-expanded-row td:visible").getByRole("button", { name: "Prendre en charge", exact: true }).click();
    await page.getByRole("dialog").waitFor(); await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Prendre en charge/);
    results.keyboard = "PASS: full title/date, 4/7-column details, Claim dialog, Escape and focus return; no server mutation";
  }
  assert.deepEqual(results.errors, []); results.status = "PASS_COMPONENT_SCOPE_ONLY";
} catch (e) { results.status = "FAIL"; results.failure = e.stack; process.exitCode = 1; }
finally { writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2)); await browser.close(); server.close(); }
console.log(JSON.stringify({ status: results.status, checks: results.checks.length, failure: results.failure }));
