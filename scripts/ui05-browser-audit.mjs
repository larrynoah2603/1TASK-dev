#!/usr/bin/env node
/**
 * UI-05: read-only browser evidence. No stored credentials, no screenshots
 * unless explicitly opted in. Node >=22, Chrome/Chromium (CHROME_BIN optional).
 *
 * Public: node scripts/ui05-browser-audit.mjs --url=https://1-task-dev.vercel.app/signin
 * Authenticated: launch a separate Chrome test profile with localhost-only
 * --remote-debugging-port=9222, sign in with an approved TEST account, then:
 * node scripts/ui05-browser-audit.mjs --cdp=http://127.0.0.1:9222 --url=https://1-task-dev.vercel.app/inbox
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_WIDTHS = [320, 375, 390, 768, 1024, 1280, 1440];
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

export function parseArgs(argv) {
  const values = {};
  for (const item of argv) {
    const index = item.indexOf("=");
    if (!item.startsWith("--") || index < 3) throw Error("Arguments must use --key=value");
    values[item.slice(2, index)] = item.slice(index + 1);
  }
  const fixture = values.fixture ?? null;
  const url = values.url ?? (fixture ? "about:blank" : null);
  if (!url) throw Error("A --url is required unless --fixture is provided");
  const location = new URL(url);
  if (!["http:", "https:", "about:"].includes(location.protocol)) throw Error("Only HTTP(S) or offline fixture supported");
  if (location.protocol === "about:" && (!fixture || url !== "about:blank")) throw Error("about:blank requires a fixture");
  if (location.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) throw Error("External URLs require HTTPS");
  const widths = (values.widths ?? DEFAULT_WIDTHS.join(",")).split(",").map(Number);
  if (widths.some((x) => !Number.isInteger(x) || x < 320 || x > 2400)) throw Error("Invalid viewport widths");
  const themes = values.themes === "light" ? ["light"] : values.themes === "dark" ? ["dark"] : values.themes === undefined || values.themes === "both" ? ["light", "dark"] : null;
  if (!themes) throw Error("themes must be light, dark or both");
  const cdp = values.cdp ?? null;
  if (cdp && !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(cdp)) throw Error("Chrome DevTools may only be accessed on localhost");
  return { url: location.href, widths, themes, cdp, fixture, output: values.output, screenshots: values.screenshots, strict: values.strict === "true" };
}

function executable() {
  const options = [process.env.CHROME_BIN, "/usr/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/opt/google/chrome/chrome"];
  return options.find((item) => item && existsSync(item)) ?? null;
}

async function waitForPort(folder, chrome) {
  for (let i = 0; i < 80; i++) {
    if (chrome.exitCode !== null) throw Error("Chrome terminated before opening its debugger");
    try {
      const port = Number(readFileSync(join(folder, "DevToolsActivePort"), "utf8").split("\n")[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    await wait(125);
  }
  throw Error("Chrome debug port timed out");
}

class DevTools {
  constructor(address) {
    this.socket = new WebSocket(address);
    this.pending = new Map();
    this.nextId = 0;
    this.ready = new Promise((ok, fail) => {
      this.socket.addEventListener("open", ok, { once: true });
      this.socket.addEventListener("error", () => fail(Error("Chrome DevTools connection failed")), { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const item = JSON.parse(data);
      const entry = this.pending.get(item.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(item.id);
      item.error ? entry.fail(Error(item.error.message)) : entry.ok(item.result);
    });
    this.socket.addEventListener("close", () => {
      for (const entry of this.pending.values()) {
        clearTimeout(entry.timer);
        entry.fail(Error("Chrome DevTools closed"));
      }
      this.pending.clear();
    });
  }
  async send(method, params = {}) {
    await this.ready;
    return new Promise((ok, fail) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => { this.pending.delete(id); fail(Error("CDP timeout: " + method)); }, 20000);
      this.pending.set(id, { ok, fail, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

function measurePage() {
  const root = document.documentElement;
  const viewport = window.innerWidth;
  const valid = (e) => {
    const r = e.getBoundingClientRect(), st = getComputedStyle(e);
    return st.display !== "none" && st.visibility !== "hidden" && r.width > 1 && r.height > 1;
  };
  const selector = (e) => {
    const classes = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    return e.tagName.toLowerCase() + classes.map((v) => "." + v.replace(/[^a-z0-9_-]/gi, "_")).join("");
  };
  const rgba = (v) => {
    const m = v.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s\/]+([\d.]+))?\)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
  };
  const over = (foreground, background) => {
    const a = foreground[3];
    return foreground.slice(0, 3).map((v, i) => v * a + background[i] * (1 - a));
  };
  const luminance = (rgb) => {
    const ch = (x) => { const v = x / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    return ch(rgb[0]) * .2126 + ch(rgb[1]) * .7152 + ch(rgb[2]) * .0722;
  };
  const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const background = (el) => {
    const nodes = []; let e = el;
    while (e instanceof Element) { nodes.unshift(e); e = e.parentElement; }
    let color = getComputedStyle(root).colorScheme.includes("dark") ? [16, 27, 24] : [255, 255, 255];
    let uncertain = false;
    for (const node of nodes) {
      const st = getComputedStyle(node), c = rgba(st.backgroundColor);
      if (c) { if (c[3] > 0 && c[3] < 1) uncertain = true; color = over(c, color); }
      if (st.backgroundImage !== "none" || st.backdropFilter !== "none") uncertain = true;
    }
    return { color, uncertain };
  };
  const contrastFindings = [];
  for (const element of document.querySelectorAll("h1,h2,h3,p,small,label,button,a,td,th,dt,dd,span")) {
    if (contrastFindings.length >= 30) break;
    if (!valid(element) || !element.textContent.trim() || element.children.length > 2) continue;
    const css = getComputedStyle(element), foreground = rgba(css.color);
    if (!foreground || foreground[3] < .9) continue;
    const bg = background(element), size = parseFloat(css.fontSize), weight = parseInt(css.fontWeight, 10) || 400;
    const limit = size >= 24 || size >= 18.66 && weight >= 700 ? 3 : 4.5;
    const result = ratio(foreground, bg.color);
    if (result < limit) contrastFindings.push({ element: selector(element), ratio: +result.toFixed(2), min: limit, glassApproximation: bg.uncertain });
  }
  const overflowingNodes = [];
  if (root.scrollWidth > viewport + 2) {
    for (const element of document.querySelectorAll("main *, .app-shell *")) {
      if (overflowingNodes.length >= 12) break;
      if (valid(element) && element.getBoundingClientRect().right > viewport + 3 && getComputedStyle(element).position !== "fixed") overflowingNodes.push(selector(element));
    }
  }
  let controls = 0, smallTargets = 0, unlabeledControls = 0;
  for (const element of document.querySelectorAll("button,a[href],input:not([type=hidden]),select,textarea,[role=button]")) {
    if (!valid(element)) continue;
    controls++;
    const r = element.getBoundingClientRect();
    if (r.width < 36 || r.height < 36) smallTargets++;
    const label = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title") || element.textContent.trim() || element.closest("label") || element.id && document.querySelector("label[for='" + CSS.escape(element.id) + "']");
    if (!label) unlabeledControls++;
  }
  return {
    viewport, scrollWidth: root.scrollWidth, horizontalOverflow: root.scrollWidth > viewport + 2,
    overflowingNodes, contrastFindings, controls, smallTargets, unlabeledControls,
    h1Count: document.querySelectorAll("h1").length,
    profile: root.getAttribute("data-visual-profile"), theme: root.getAttribute("data-theme")
  };
}

async function waitForPage(cdp, expected) {
  let current = "";
  for (let i = 0; i < 80; i++) {
    const v = await cdp.send("Runtime.evaluate", { expression: "({ ready: document.readyState, path: location.pathname })", returnByValue: true });
    const data = v.result?.value;
    if (data?.path) current = data.path;
    if (data?.ready === "complete" && current === expected) {
      await cdp.send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
      await wait(350);
      return current;
    }
    if (i >= 20 && data?.ready === "complete" && current && current !== "/") return current;
    await wait(100);
  }
  return current;
}

export async function audit(options) {
  let chrome, directory, cdp, tab, host;
  const runs = [];
  try {
    if (options.cdp) host = options.cdp;
    else {
      const bin = executable();
      if (!bin) throw Error("Chrome not found; provide CHROME_BIN");
      directory = mkdtempSync(join(tmpdir(), "1task-ui05-"));
      chrome = spawn(bin, [
        "--headless=new", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
        "--disable-background-networking", "--disable-extensions", "--remote-debugging-address=127.0.0.1",
        "--remote-allow-origins=*", "--remote-debugging-port=0", "--user-data-dir=" + directory, "about:blank"
      ], { stdio: "ignore" });
      host = "http://127.0.0.1:" + await waitForPort(directory, chrome);
    }
    const opened = await fetch(host + "/json/new?about:blank", { method: "PUT" });
    if (!opened.ok) throw Error("Chrome refused the new audit tab");
    tab = await opened.json();
    cdp = new DevTools(tab.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    for (const width of options.widths) for (const theme of options.themes) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: false });
      await cdp.send("Emulation.setEmulatedMedia", { features: [
        { name: "prefers-color-scheme", value: theme }, { name: "prefers-reduced-motion", value: "reduce" }
      ] });
      if (options.fixture) {
        const tree = await cdp.send("Page.getFrameTree");
        await cdp.send("Page.setDocumentContent", { frameId: tree.frameTree.frame.id, html: readFileSync(options.fixture, "utf8") });
        await wait(200);
      } else {
        const nav = await cdp.send("Page.navigate", { url: options.url });
        if (nav.errorText) { runs.push({ width, theme, status: "NAVIGATION_BLOCKED", reason: nav.errorText }); continue; }
        if (await waitForPage(cdp, new URL(options.url).pathname) !== new URL(options.url).pathname) {
          runs.push({ width, theme, status: "NOT_AUTHENTICATED_OR_REDIRECTED" }); continue;
        }
      }
      await cdp.send("Runtime.evaluate", { expression: "document.documentElement.dataset.theme=" + JSON.stringify(theme) + ";document.documentElement.dataset.visualProfile='bios-glass-v31'" });
      await wait(150);
      const result = await cdp.send("Runtime.evaluate", { expression: "(" + measurePage.toString() + ")()", returnByValue: true });
      if (result.exceptionDetails || !result.result?.value) throw Error("Chrome could not measure this page");
      const measurement = result.result.value;
      runs.push({ width, theme, status: "MEASURED", ...measurement, viewportMismatch: measurement.viewport !== width });
      if (options.screenshots) {
        mkdirSync(options.screenshots, { recursive: true });
        const image = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        // No route IDs or names in filenames; store only on the tester's computer.
        writeFileSync(join(options.screenshots, "UI05-" + width + "-" + theme + ".png"), Buffer.from(image.data, "base64"));
      }
    }
    const report = {
      audit: "1TASK UI-05", at: new Date().toISOString(),
      origin: options.fixture ? "offline-fixture" : new URL(options.url).origin,
      limitation: "Approximate blended contrast; gradient/blurred Glass still requires visual inspection and WCAG manual verification.",
      screenshots: Boolean(options.screenshots), results: runs
    };
    if (options.output) {
      mkdirSync(dirname(resolve(options.output)), { recursive: true });
      writeFileSync(options.output, JSON.stringify(report, null, 2) + "\n");
    }
    console.log(JSON.stringify(report, null, 2));
    if (runs.some((x) => x.status !== "MEASURED")) process.exitCode = 2;
    if (options.strict && runs.some((x) => x.horizontalOverflow || x.viewportMismatch || x.unlabeledControls || x.contrastFindings.some((v) => !v.glassApproximation))) process.exitCode = 3;
  } finally {
    cdp?.close();
    if (tab && host) await fetch(host + "/json/close/" + tab.id).catch(() => {});
    if (chrome) { chrome.kill("SIGTERM"); await wait(150); if (chrome.exitCode === null) chrome.kill("SIGKILL"); }
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  audit(parseArgs(process.argv.slice(2))).catch((err) => { console.error("UI-05 audit error: " + err.message); process.exitCode = 1; });
}
