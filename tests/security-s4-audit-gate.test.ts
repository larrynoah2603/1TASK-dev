import { describe, expect, it } from "vitest";
// The runtime gate is a dependency-free Node ESM CLI; its JS implementation
// is deliberately not included in TypeScript compilation.
// @ts-ignore -- Node-only .mjs module without TS declaration.
import { assessAudit, EXPIRES_AT } from "@/scripts/security-audit-gate.mjs";
import { readFileSync } from "node:fs";

const BEFORE_EXPIRY = new Date("2026-10-13T12:00:00Z");
function advisory(id: string, packageName: string) {
  return { name: packageName, severity: "high", url: `https://github.com/advisories/${id}` };
}
function report(vulnerabilities: Record<string, { severity: string; via: unknown[] }>) {
  return { auditReportVersion: 2, vulnerabilities };
}
const known = report({
  "deepmerge-ts": {
    severity: "high", via: [advisory("GHSA-ggr8-5vv4-36mx", "deepmerge-ts")],
  },
  "@prisma/config": { severity: "high", via: ["deepmerge-ts"] },
  prisma: { severity: "high", via: ["@prisma/config"] },
  "source-map-js": {
    severity: "high", via: [advisory("GHSA-68fv-2mgg-jv7q", "source-map-js")],
  },
});
const lock = {
  packages: {
    "node_modules/deepmerge-ts": { version: "7.1.5" },
    "node_modules/@prisma/config": { version: "6.19.3" },
    "node_modules/prisma": { version: "6.19.3" },
    "node_modules/source-map-js": { version: "1.2.1" },
  },
};
describe("Security S4 — npm audit temporary allowlist", () => {
  it("accepte uniquement les 4 entrées HIGH connues AVANT expiration", () => {
    expect(assessAudit(known, lock, BEFORE_EXPIRY)).toEqual({
      accepted: ["deepmerge-ts", "@prisma/config", "prisma", "source-map-js"],
      blocked: [],
    });
  });

  it("bloque une nouvelle vulnérabilité HIGH au lieu d'ignorer l'audit", () => {
    const finding = report({ ...known.vulnerabilities,
      "new-package": { severity: "high", via: [advisory("GHSA-abcd-1234-5678", "new-package")] },
    });
    expect(assessAudit(finding, lock, BEFORE_EXPIRY).blocked).toContainEqual({
      name: "new-package", severity: "high", reason: "not on the exact-version advisory allowlist",
    });
  });

  it("ne permet JAMAIS une nouvelle vulnérabilité CRITICAL même dans un package connu", () => {
    const finding = report({ ...known.vulnerabilities,
      "deepmerge-ts": { severity: "critical", via: [advisory("GHSA-ggr8-5vv4-36mx", "deepmerge-ts")] },
    });
    expect(assessAudit(finding, lock, BEFORE_EXPIRY).blocked).toContainEqual({
      name: "deepmerge-ts", severity: "critical", reason: "critical",
    });
  });

  it("rejette le même package avec un nouvel avis de sécurité", () => {
    const finding = report({
      "deepmerge-ts": { severity: "high", via: [
        advisory("GHSA-ggr8-5vv4-36mx", "deepmerge-ts"),
        advisory("GHSA-aaaa-bbbb-cccc", "deepmerge-ts"),
      ] },
    });
    expect(assessAudit(finding, lock, BEFORE_EXPIRY).blocked).toHaveLength(1);
  });

  it("ne tolère pas le remplacement des versions lockées par d'autres versions vulnérables", () => {
    const changed = structuredClone(lock);
    changed.packages["node_modules/deepmerge-ts"].version = "7.1.4";
    expect(assessAudit(known, changed, BEFORE_EXPIRY).blocked.some((x: { name: string }) => x.name === "deepmerge-ts")).toBe(true);
  });

  it("expire impérativement le 28 octobre 2026 à 00:00 UTC", () => {
    expect(EXPIRES_AT).toBe("2026-10-28T00:00:00.000Z");
    expect(assessAudit(known, lock, new Date(EXPIRES_AT)).blocked).toContainEqual({
      name: "exception-policy", severity: "high", reason: "temporary exception expired",
    });
  });

  it("refuse un JSON vide ou erroné et n'ignore pas les erreurs npm audit", () => {
    expect(() => assessAudit(null, lock)).toThrow();
    expect(() => assessAudit({ error: { summary: "Network failure" }, vulnerabilities: {} }, lock)).toThrow();
    expect(() => assessAudit({ vulnerabilities: [] }, lock)).toThrow();
    expect(() => assessAudit(known, null)).toThrow();
  });

  it("réussit normalement lorsque toutes les vulnérabilités HIGH ont été corrigées", () => {
    const safe = report({
      "older-moderate-only": { severity: "moderate", via: [advisory("GHSA-zzzz-0000-1111", "older-moderate-only")] },
    });
    expect(assessAudit(safe, lock, new Date("2030-01-01"))).toEqual({ accepted: [], blocked: [] });
  });

  it("maintient la CI S3 avec les scans de secrets et l'audit critique global", () => {
    const workflow = readFileSync(".github/workflows/security-s3.yml", "utf8");
    expect(workflow).toContain("node scripts/security-secret-scan.mjs");
    expect(workflow).toContain("node scripts/security-audit-gate.mjs");
    expect(workflow).toContain("npm audit --package-lock-only --audit-level=critical");
    expect(workflow).not.toContain("continue-on-error:");
    expect(workflow).toContain('exit "$audit_status"');
  });

  it("vérifie la chaîne vulnérable effectivement épinglée dans package-lock.json", () => {
    const currentLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    for (const [pkg, pinned] of Object.entries(lock.packages)) {
      expect(currentLock.packages[pkg]?.version, pkg).toBe(pinned.version);
    }
  });
});
