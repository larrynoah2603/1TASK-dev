import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

/* Real computed-style checks in headless Chromium, using the actual project
   stylesheets and a synthetic shell (no auth, personal data or business fixtures).
   Explicitly skipped when Chromium is not installed; this is NOT an E2E app test. */
const root = process.cwd();
const css = [
  "styles/legacy.css",
  "styles/tokens.css",
  "styles/legacy-bridge.css",
  "styles/design-system.css",
  "styles/unified-components.css",
  "styles/ticketing-workflows.css",
  "styles/admin-workspace.css",
  "styles/asset-workspace.css",
  "styles/reporting-notifications.css",
  "styles/bios-1task-finish.css",
  "styles/v1-visual-finish.css",
  "styles/bios-glass-v31-preview.css",
  "styles/bios-glass-v31-components.css",
  "styles/bios-glass-v31-shell-v1.css",
  "styles/bios-glass-v31-v1-pages.css",
  "styles/uupm-refonte.css",
];
const chromium = [
  process.env.CHROMIUM_BIN,
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/opt/google/chrome/chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((binary) => binary && existsSync(binary));

type Evidence = {
  theme: string;
  profile: string;
  sidebarColor: string;
  topbarColor: string;
  cardColor: string;
  titleColor: string;
  tooltipColor: string;
  sidebarWidth: number;
  topbarHeight: number;
  mainPadding: number;
  gridColumns: number;
  containerWidth: number;
  pageOverflow: boolean;
};

function computed(theme: "light" | "dark", width: number, collapsed = false): Evidence {
  const dir = mkdtempSync(join(tmpdir(), "bios-glass-"));
  try {
    const links = css.map((file) => `<link rel="stylesheet" href="${pathToFileURL(join(root, file)).href}">`).join("");
    const html = `<!doctype html><html lang="fr" data-visual-profile="bios-glass-v31" data-theme="${theme}">
      <head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}</style>${links}</head>
      <body><div class="kit-app" data-sidebar-collapsed="${collapsed}">
        <aside class="kit-sidebar"><nav class="kit-sidebar-nav"><a class="kit-nav-item">Tableau de bord</a></nav></aside>
        <div class="kit-content"><header class="kit-topbar"><span>1TASK</span></header>
          <main class="kit-main"><section class="dashboard-reference-page">
            <header class="dashboard-reference-header"><h1>Tableau de bord</h1></header>
            <div class="dashboard-kpi-grid">
              <div class="dashboard-kpi-card"><strong>12</strong></div><div class="dashboard-kpi-card"><strong>3</strong></div>
              <div class="dashboard-kpi-card"><strong>0</strong></div><div class="dashboard-kpi-card"><strong>7</strong></div>
            </div>
            <div class="reporting-card"><div class="recharts-default-tooltip" style="background-color:var(--bios-glass-raised,var(--kit-card));color:var(--kit-text)">Tooltip test</div></div>
          </section></main></div></div>
        <script>
          const pick = (s) => document.querySelector(s);
          const style = (s) => getComputedStyle(pick(s));
          const grid = style(".dashboard-kpi-grid");
          const columns = grid.gridTemplateColumns.split(/\\s+/).filter(Boolean).length;
          const v = {
            theme: document.documentElement.dataset.theme,
            profile: document.documentElement.dataset.visualProfile,
            sidebarColor: style(".kit-sidebar").backgroundColor,
            topbarColor: style(".kit-topbar").backgroundColor,
            cardColor: style(".dashboard-kpi-card").backgroundColor,
            titleColor: style(".dashboard-reference-header h1").color,
            tooltipColor: style(".recharts-default-tooltip").backgroundColor,
            sidebarWidth: pick(".kit-sidebar").getBoundingClientRect().width,
            topbarHeight: pick(".kit-topbar").getBoundingClientRect().height,
            mainPadding: parseFloat(style(".kit-main").paddingLeft),
            gridColumns: columns,
            containerWidth: pick(".dashboard-reference-page").getBoundingClientRect().width,
            pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          };
          document.body.dataset.evidence = encodeURIComponent(JSON.stringify(v));
        </script></body></html>`;
    const fixture = join(dir, "fixture.html");
    writeFileSync(fixture, html, "utf8");
    const result = spawnSync(chromium!, [
      "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
      "--disable-extensions", "--no-first-run", "--allow-file-access-from-files",
      `--window-size=${width},900`, "--dump-dom", pathToFileURL(fixture).href,
    ], { encoding: "utf8", timeout: 20_000 });
    if (result.error || result.status !== 0) throw new Error(`Chromium failed: ${result.error?.message ?? result.stderr.slice(-600)}`);
    const match = result.stdout.match(/data-evidence="([^"]+)"/);
    if (!match) throw new Error("No browser-computed evidence found");
    return JSON.parse(decodeURIComponent(match[1])) as Evidence;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The CI runner's system Chromium can hang before DOM output. Do not convert
// that infrastructure failure into a product regression or a fake PASS.
// Opt in on a machine with a working local Chromium and audit the output.
const browserChecksEnabled = process.env.RUN_BIOS_BROWSER_TESTS === "1" && Boolean(chromium);
describe.skipIf(!browserChecksEnabled)("BIOS theme computed styles (synthetic shell in Chromium)", () => {
  it("uses theme-specific composed surfaces with unchanged desktop dimensions", () => {
    const light = computed("light", 1440);
    const dark = computed("dark", 1440);
    expect(light.profile).toBe("bios-glass-v31");
    expect(dark.profile).toBe("bios-glass-v31");
    expect([light.theme, dark.theme]).toEqual(["light", "dark"]);
    expect(light.sidebarColor).toMatch(/255, 255, 255/);
    expect(light.topbarColor).toMatch(/255, 255, 255/);
    expect(dark.sidebarColor).toMatch(/25, 43, 35/);
    expect(dark.topbarColor).toMatch(/25, 43, 35/);
    expect(dark.cardColor).not.toBe(light.cardColor);
    expect(dark.tooltipColor).not.toBe(light.tooltipColor);
    expect(light.titleColor).toBe("rgb(25, 51, 87)");
    expect(light.sidebarWidth).toBe(240);
    expect(dark.sidebarWidth).toBe(light.sidebarWidth);
    expect(light.topbarHeight).toBe(56);
    expect(dark.topbarHeight).toBe(light.topbarHeight);
    expect(light.mainPadding).toBe(32);
    expect(dark.mainPadding).toBe(light.mainPadding);
    expect(light.gridColumns).toBe(4);
    expect(dark.gridColumns).toBe(4);
    expect(light.containerWidth).toBeGreaterThanOrEqual(760);
    expect(dark.pageOverflow).toBe(false);
  }, 90_000);

  it("keeps the same collapsed width and follows the usable KPI container width", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(computed(theme, 1440, true).sidebarWidth).toBe(64);
      const compact = computed(theme, 1024);
      expect(compact.containerWidth).toBeLessThan(760);
      expect(compact.gridColumns).toBe(2);
      expect(compact.topbarHeight).toBe(56);
    }
  }, 90_000);
});
