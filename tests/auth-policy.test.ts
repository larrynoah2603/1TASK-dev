import { describe, expect, it } from "vitest";
import {
  getProfileEmail,
  isEmailAllowedForDomain,
  isSignInAccountAllowed,
  isSupportedAuthProvider,
} from "@/lib/auth-policy";

describe("politique d’authentification", () => {
  it("compare le domaine complet et refuse les suffixes usurpés", () => {
    expect(isEmailAllowedForDomain("User@bios-expertise.com", "bios-expertise.com")).toBe(true);
    expect(isEmailAllowedForDomain("User@bios-expertise.com.evil.test", "bios-expertise.com")).toBe(false);
  });

  it("récupère l’e-mail de secours Microsoft", () => {
    expect(getProfileEmail(null, { preferred_username: "personne@bios-expertise.com" })).toBe(
      "personne@bios-expertise.com",
    );
  });

  it("n’autorise que Microsoft Entra ID", () => {
    expect(isSupportedAuthProvider("microsoft-entra-id")).toBe(true);
    expect(isSupportedAuthProvider("google")).toBe(false);
    expect(isSupportedAuthProvider("credentials")).toBe(false);
  });

  it("refuse une identité suspendue même si son statut paraît actif", () => {
    expect(isSignInAccountAllowed({ status: "ACTIVE", administrativelyDisabled: true })).toBe(false);
    expect(isSignInAccountAllowed({ status: "DISABLED", administrativelyDisabled: false })).toBe(false);
    expect(isSignInAccountAllowed({ status: "ACTIVE", administrativelyDisabled: false })).toBe(true);
  });
});
