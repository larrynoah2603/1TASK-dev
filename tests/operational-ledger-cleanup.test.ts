import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("app/globals.css", "utf8");
const interfaceSource = globSync(["app/**/*.tsx", "components/**/*.tsx"])
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

describe("Operational Ledger progressive cleanup", () => {
  it("removes the historical purple link literal from interface JSX", () => {
    expect(interfaceSource).not.toContain("#4c4dba");
  });

  it("reserves the operational accent for the ticket creation action", () => {
    expect(styles).toContain(".new-ticket-launcher");
    expect(styles).toContain("background: var(--ledger-operational);");
  });
});
