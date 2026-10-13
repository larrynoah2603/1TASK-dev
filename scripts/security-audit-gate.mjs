#!/usr/bin/env node
/**
 * S4: short-lived, fail-closed npm audit exception policy.
 *
 * Allows ONLY the high-severity advisories already triaged for the CURRENT
 * locked versions. A different advisory, package, version, critical finding
 * or malformed audit result still fails CI.
 *
 * Deadline: 2026-10-27 inclusive. Remove the exception after remediation.
 */
import { readFileSync, appendFileSync } from "node:fs";
import { resolve, pathToFileURL } from "node:url";

export const EXPIRES_AT = "2026-10-28T00:00:00.000Z";

const TEMPORARY_EXCEPTIONS = Object.freeze({
  "deepmerge-ts": { version: "7.1.5", via: ["GHSA-ggr8-5vv4-36mx"] },
  "@prisma/config": { version: "6.19.3", via: ["deepmerge-ts"] },
  "prisma": { version: "6.19.3", via: ["@prisma/config"] },
  "source-map-js": { version: "1.2.1", via: ["GHSA-68fv-2mgg-jv7q"] },
});

function advisoryId(advisory) {
  if (typeof advisory === "string") return advisory;
  if (!advisory || typeof advisory !== "object" || typeof advisory.url !== "string") return "";
  const match = advisory.url.match(/\/advisories\/(GHSA-[a-z0-9-]+)(?:[/?#]|$)/i);
  return match?.[1] ?? "";
}

function exceptionMatches(name, vulnerability, lockfile) {
  const exception = TEMPORARY_EXCEPTIONS[name];
  if (!exception || vulnerability.severity !== "high") return false;
  const locked = lockfile?.packages?.[`node_modules/${name}`]?.version;
  if (locked !== exception.version) return false;
  if (!Array.isArray(vulnerability.via) || vulnerability.via.length === 0) return false;
  const encountered = vulnerability.via.map(advisoryId).sort();
  return encountered.length === exception.via.length &&
    encountered.every((entry, index) => entry === [...exception.via].sort()[index]);
}

export function assessAudit(report, lockfile, now = new Date()) {
  if (!report || typeof report !== "object" ||
      !report.vulnerabilities || typeof report.vulnerabilities !== "object" ||
      Array.isArray(report.vulnerabilities) || report.error ||
      !lockfile?.packages) {
    throw new Error("Invalid npm audit or package-lock input; audit cannot be bypassed.");
  }

  const accepted = [];
  const blocked = [];
  const severity = new Set(["high", "critical"]);
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    if (!finding || typeof finding !== "object" || !severity.has(finding.severity)) continue;
    if (finding.severity === "critical") {
      blocked.push({ name, severity: finding.severity, reason: "critical" });
      continue;
    }
    if (exceptionMatches(name, finding, lockfile)) {
      accepted.push(name);
    } else {
      blocked.push({ name, severity: finding.severity, reason: "not on the exact-version advisory allowlist" });
    }
  }

  if (accepted.length && now.getTime() >= Date.parse(EXPIRES_AT)) {
    blocked.push({ name: "exception-policy", severity: "high", reason: "temporary exception expired" });
  }
  return { accepted, blocked };
}

export function runCli(auditPath, lockPath = "package-lock.json") {
  if (!auditPath) throw new Error("Expected npm audit JSON file path");
  const report = JSON.parse(readFileSync(auditPath, "utf8"));
  const lockfile = JSON.parse(readFileSync(lockPath, "utf8"));
  const { accepted, blocked } = assessAudit(report, lockfile);
  const summary = [
    "### S4 — npm audit, dérogation temporaire",
    `Exceptions connues : ${accepted.join(", ") || "aucune"}`,
    `Nouvelles vulnérabilités HIGH/CRITICAL : ${blocked.length}`,
    `Expiration automatique : ${EXPIRES_AT}`,
    "La remédiation du lockfile demeure obligatoire.",
  ];
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n") + "\n");
  }
  for (const name of accepted) {
    console.warn(`::warning title=Temporary S4 npm audit exception::${name} is still vulnerable; remediation required before 2026-10-28`);
  }
  for (const finding of blocked) {
    console.error(`::error title=Security audit blocked::${finding.name}: ${finding.reason}`);
  }
  if (blocked.length) process.exitCode = 1;
  else console.info("S4: no unapproved HIGH/CRITICAL advisories; security gate passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    runCli(process.argv[2], process.argv[3]);
  } catch (error) {
    console.error("::error title=Security audit failed closed::Audit input invalid or inaccessible.");
    process.exitCode = 1;
  }
}
