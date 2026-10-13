import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function runScan(source: string) {
  const dir = mkdtempSync(resolve(tmpdir(), "1task-security-s3-"));
  try {
    const init = spawnSync("git", ["init", "-q"], { cwd: dir, encoding: "utf8" });
    expect(init.status).toBe(0);
    writeFileSync(resolve(dir, "sample.txt"), source);
    const added = spawnSync("git", ["add", "sample.txt"], { cwd: dir, encoding: "utf8" });
    expect(added.status).toBe(0);
    return spawnSync("node", [resolve(process.cwd(), "scripts/security-secret-scan.mjs")], {
      cwd: dir, encoding: "utf8",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("S3 — détecteur CI de secrets sans divulgation", () => {
  it("accepte un code ordinaire et un identifiant non sensible", () => {
    const scan = runScan("Titre ticket TCK-20261013-001\\nUser.Read\\nClient ID non-secret");
    expect(scan.status).toBe(0);
    expect(scan.stdout).toContain("no high-confidence patterns");
  });

  it("rejette un PAT GitHub simulé sans jamais l'imprimer", () => {
    const token = "ghp_" + "z".repeat(40);
    const scan = runScan(`token=${token}`);
    expect(scan.status).toBe(1);
    expect(scan.stderr).toContain("sample.txt:1 (github-pat)");
    expect(scan.stderr).not.toContain(token);
  });

  it("rejette une clé PEM simulée sans afficher les octets", () => {
    const head = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
    const scan = runScan(head + "\\nTest fake only");
    expect(scan.status).toBe(1);
    expect(scan.stderr).toContain("(private-key-pem)");
  });
});
