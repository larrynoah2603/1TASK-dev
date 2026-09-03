import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(resolve(process.cwd(), "components/notification-center.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("journal de notifications Operational Ledger", () => {
  it("retire les couleurs et tailles minuscules du JSX", () => {
    expect(component).toContain("notification-mark-all");
    expect(component).toContain("notification-item-meta");
    expect(component).not.toContain("text-[#4c4dba]");
    expect(component).not.toContain("text-[10px]");
  });

  it("utilise des séparateurs chronologiques et une métadonnée lisible", () => {
    const ledger = css.slice(css.indexOf("Operational Ledger — notification log"));
    expect(ledger).toContain("border-bottom: 1px solid var(--ledger-border)");
    expect(ledger).toContain(".notification-item-meta");
    expect(ledger).toContain("font-size: 12px");
  });
});
