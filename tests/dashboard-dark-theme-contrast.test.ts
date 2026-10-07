import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function luminance(hex: string) {
  const channels = hex.replace("#", "").match(/.{2}/g)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(foreground: string, background: string) {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("dashboard dark theme contrast", () => {
  it("maps the requester dashboard to theme-aware text and KPI tone tokens", () => {
    const bridge = source("styles/legacy-bridge.css");

    expect(bridge).toContain("html[data-theme] .dashboard-reference-header h1");
    expect(bridge).toContain("html[data-theme] .dashboard-kpi-card strong");
    expect(bridge).toContain("html[data-theme] .dashboard-kpi-info strong");
    expect(bridge).toContain("color: var(--kit-info-text) !important");
    expect(bridge).toContain("html[data-theme] .dashboard-kpi-warning strong");
    expect(bridge).toContain("color: var(--kit-warning-text) !important");
    expect(bridge).toContain("html[data-theme] .dashboard-kpi-success strong");
    expect(bridge).toContain("color: var(--kit-success-text) !important");
    expect(bridge).toContain("html[data-theme] .dashboard-kpi-danger strong");
    expect(bridge).toContain("color: var(--kit-danger-text) !important");
  });

  it("keeps all dark dashboard KPI values above AA text contrast", () => {
    const card = "#1E2023";
    for (const foreground of ["#F5F6F7", "#8DB5E2", "#E7B64A", "#74C98A", "#FF8178"]) {
      expect(contrast(foreground, card), foreground).toBeGreaterThanOrEqual(4.5);
    }
  });
});
