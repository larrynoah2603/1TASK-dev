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

describe("BIOS theme palette", () => {
  it("centralizes the requested light and dark palette in tokens", () => {
    const tokens = source("styles/tokens.css");

    for (const value of [
      "#F8F9FB", "#FFFFFF", "#E2E5E9", "#202124", "#646567", "#EA7C29", "#C4510D", "#FFF0E4",
      "#141517", "#1E2023", "#292C30", "#3B3E43", "#F5F6F7", "#B0B4BB", "#F47F2A", "#38271D",
    ]) {
      expect(tokens, value).toContain(value);
    }

    expect(tokens).toContain("--kit-brand: #EA7C29");
    expect(tokens).toContain("--kit-selected");
    expect(tokens).toContain("--kit-info");
  });

  it("meets WCAG AA contrast targets for core text, actions and selections", () => {
    const pairs = [
      ["#202124", "#F8F9FB", 4.5],
      ["#646567", "#F8F9FB", 4.5],
      ["#FFFFFF", "#C4510D", 4.5],
      ["#B5480A", "#FFF0E4", 4.5],
      ["#F5F6F7", "#141517", 4.5],
      ["#B0B4BB", "#1E2023", 4.5],
      ["#171717", "#F47F2A", 4.5],
      ["#F47F2A", "#38271D", 4.5],
      ["#2E7D32", "#FFFFFF", 4.5],
      ["#8A5A00", "#FFFFFF", 4.5],
      ["#B42318", "#FFFFFF", 4.5],
      ["#315D8C", "#FFFFFF", 4.5],
      ["#74C98A", "#1E2023", 4.5],
      ["#E7B64A", "#1E2023", 4.5],
      ["#FF8178", "#1E2023", 4.5],
      ["#8DB5E2", "#1E2023", 4.5],
    ] as const;

    for (const [foreground, background, minimum] of pairs) {
      expect(contrast(foreground, background), foreground + " on " + background).toBeGreaterThanOrEqual(minimum);
    }
  });

  it("keeps brand, selection and semantic statuses separate", () => {
    const designSystem = source("styles/design-system.css");
    const bridge = source("styles/legacy-bridge.css");

    expect(designSystem).toContain(".kit-badge-info { background: var(--kit-info-soft); color: var(--kit-info-text); }");
    expect(designSystem).toContain("background: var(--kit-brand); color: var(--kit-on-brand)");
    expect(designSystem).toContain("background: var(--kit-selected); color: var(--kit-selected-text)");
    expect(bridge).toContain(".view-switcher-link-active");
    expect(bridge).toContain("background: var(--kit-selected) !important");
  });

  it("removes light-only surfaces from audited dark-theme controls", () => {
    const filters = source("components/ticket-filters.tsx");
    const notificationFilter = source("components/notifications/notification-filter.tsx");
    const signIn = source("app/signin/page.tsx");
    const loader = source("app/globals.css");

    expect(filters).toContain("bg-[var(--kit-glass)]");
    expect(notificationFilter).toContain("bg-[var(--kit-selected)]");
    expect(notificationFilter).toContain("bg-[var(--kit-surface)]");
    expect(signIn).toContain("bg-[var(--kit-primary)]");
    expect(loader).toContain("var(--kit-brand)");
    expect(loader).toContain("var(--kit-bg)");
  });

  it("themes charts with tokens instead of the retired indigo palette", () => {
    const chart = source("components/dashboard/dashboard-chart-card.tsx");
    expect(chart).toContain('stroke="var(--kit-primary)"');
    expect(chart).toContain('stroke="var(--kit-border)"');
    expect(chart).not.toContain("#4f46e5");
    expect(chart).not.toContain("#e2e8f0");
  });
});
