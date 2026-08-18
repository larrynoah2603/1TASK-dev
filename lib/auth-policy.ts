export type SupportedAuthProvider = "microsoft-entra-id";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return email;
}

export function getProfileEmail(userEmail: unknown, profile: unknown): string | null {
  const profileRecord = asRecord(profile);
  return (
    normalizeEmail(userEmail) ??
    normalizeEmail(profileRecord.email) ??
    normalizeEmail(profileRecord.preferred_username)
  );
}

export function isEmailAllowedForDomain(email: string, allowedDomain: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  const normalizedDomain = allowedDomain.trim().replace(/^@/, "").toLowerCase();
  return Boolean(normalizedEmail && normalizedDomain && normalizedEmail.endsWith("@" + normalizedDomain));
}

export function isEmailAllowed(email: string): boolean {
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
  if (!allowedDomain) return process.env.NODE_ENV !== "production";
  return isEmailAllowedForDomain(email, allowedDomain);
}

export function isSupportedAuthProvider(provider: string): provider is SupportedAuthProvider {
  return provider === "microsoft-entra-id";
}
