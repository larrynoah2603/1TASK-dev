#!/usr/bin/env node
/**
 * High-confidence secret patterns in repository-tracked text files.
 * Reports only file path, line and pattern name — never candidate material.
 * This is a lightweight CI guard, not a historical or comprehensive scanner.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff",
  ".woff2", ".ttf", ".otf", ".pdf", ".zip", ".gz", ".wasm",
]);
const LIMIT_BYTES = 2_000_000;
// Keep test examples constructed at runtime; the scanner itself must not
// contain anything that resembles a production credential.
export const PATTERNS = [
  ["private-key-pem", /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ["github-pat", /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{35,}/g],
  ["aws-access-key", /(?:AKIA|ASIA)[0-9A-Z]{16}/g],
  ["slack-bot-token", /xox[baprs]-[A-Za-z0-9-]{20,}/g],
  ["stripe-secret-key", /sk_(?:live|test)_[A-Za-z0-9]{20,}/g],
  ["openai-secret-key", /sk-(?:proj-)?[A-Za-z0-9_-]{35,}/g],
];

export function scanContent(text) {
  const findings = [];
  for (const [name, pattern] of PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ pattern: name, line });
    }
  }
  return findings;
}

export function scanTrackedFiles() {
  const paths = execFileSync("git", ["ls-files", "-z"], { maxBuffer: 16 * 1024 * 1024 })
    .toString("utf8").split("\0").filter(Boolean);
  const findings = [];
  let skippedLarge = 0;
  for (const file of paths) {
    if (BINARY_EXTENSIONS.has(extname(file).toLowerCase())) continue;
    const size = statSync(file).size;
    if (size > LIMIT_BYTES) { skippedLarge++; continue; }
    const content = readFileSync(file, "utf8");
    for (const item of scanContent(content)) {
      findings.push({ file, ...item });
    }
  }
  return { findings, scannedFiles: paths.length, skippedLarge };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const result = scanTrackedFiles();
  if (result.findings.length) {
    console.error(`Security scan: ${result.findings.length} suspicious credential pattern(s).`);
    for (const { file, line, pattern } of result.findings) {
      console.error(`  ${file}:${line} (${pattern})`);
    }
    process.exitCode = 1;
  } else {
    console.info(`Security scan: no high-confidence patterns in ${result.scannedFiles} tracked paths.`);
  }
  if (result.skippedLarge) console.warn(`Security scan: ${result.skippedLarge} file(s) >2MB skipped; scan separately.`);
}
