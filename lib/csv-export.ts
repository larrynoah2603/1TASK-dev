/**
 * Escapes untrusted CSV values for manual spreadsheet opening.
 * RFC 4180 quotes alone do not stop Excel/LibreOffice formula execution.
 * Preserve numeric cells as numbers; dangerous textual prefixes become text.
 */
export function csvCell(value: unknown): string {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  // Prevent tabs, line breaks, Unicode separators and invisible prefixes from
  // shifting the point where a spreadsheet detects formula metacharacters.
  const normalized = text.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200d\u2060\ufeff]/gu, " ");
  const startsWithFormula = !isNumber && /^[=+\-@]/u.test(normalized.trimStart().normalize("NFKC"));
  const safe = startsWithFormula ? `'${normalized.trimStart()}` : normalized;
  return `"${safe.replaceAll('"', '""')}"`;
}
