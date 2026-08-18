/**
 * Canonical form used for values received from Microsoft Entra ID. The raw
 * value remains stored for audit and administration; this key is only used to
 * make matching stable across case, accents and repeated spaces.
 */
export function normalizeEntraDepartmentValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr-FR");
}
