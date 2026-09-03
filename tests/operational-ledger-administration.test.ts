import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const primitives = readFileSync("components/admin-primitives.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");

describe("Operational Ledger administration", () => {
  it("uses semantic administrative KPI tones rather than palette names", () => {
    expect(primitives).toContain('tone = "primary"');
    expect(primitives).toContain('"primary" | "success" | "warning" | "danger"');
    expect(primitives).not.toContain("text-[#4c4dba]");
  });

  it("keeps administrative surfaces documentary and undecorated", () => {
    expect(primitives).toContain('className="admin-empty-state"');
    expect(styles).toContain("/* Operational Ledger — administration register */");
    expect(styles).toContain("box-shadow: none;");
  });
});
