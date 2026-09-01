import { RoleCode, UserStatus } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
  isBootstrapFunctionalAdminEmail,
  PERMISSION_CATALOG,
  ROLE_PERMISSION_CODES,
  statusAfterEntraSynchronization,
} from "@/lib/identity";

describe("bootstrap administrateur 1TASK", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reconnaît l’adresse de l’administrateur fonctionnel du prototype", () => {
    expect(DEFAULT_BOOTSTRAP_ADMIN_EMAIL).toBe("larry.andrianina@bios-expertise.com");
    expect(isBootstrapFunctionalAdminEmail("Larry.Andrianina@Bios-Expertise.com")).toBe(true);
  });

  it("ne transforme pas une autre adresse en administrateur par défaut", () => {
    expect(isBootstrapFunctionalAdminEmail("agent@bios-expertise.com")).toBe(false);
  });

  it("exige une configuration explicite du bootstrap en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isBootstrapFunctionalAdminEmail(DEFAULT_BOOTSTRAP_ADMIN_EMAIL)).toBe(false);

    vi.stubEnv("ADMIN_EMAILS", DEFAULT_BOOTSTRAP_ADMIN_EMAIL);
    expect(isBootstrapFunctionalAdminEmail(DEFAULT_BOOTSTRAP_ADMIN_EMAIL)).toBe(true);
  });

  it("active le véritable compte Entra bootstrapé sans passer par le seed", () => {
    expect(statusAfterEntraSynchronization({
      email: DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
      administrativelyDisabled: false,
      firstSynchronization: true,
    })).toBe(UserStatus.ACTIVE);

    expect(statusAfterEntraSynchronization({
      email: "nouvel.utilisateur@bios-expertise.com",
      administrativelyDisabled: false,
      firstSynchronization: true,
    })).toBe(UserStatus.PENDING_ASSIGNMENT);
  });

  it("déclare la permission de création inter-départementale dans le catalogue runtime", () => {
    expect(PERMISSION_CATALOG["ticket:create:cross-department"]).toBeDefined();
    expect(PERMISSION_CATALOG["catalog:propose"]).toBeDefined();
  });

  it("réserve les permissions Actifs à l’administrateur fonctionnel", () => {
    expect(ROLE_PERMISSION_CODES[RoleCode.FUNCTIONAL_ADMIN]).toContain("asset:read");
    expect(ROLE_PERMISSION_CODES[RoleCode.FUNCTIONAL_ADMIN]).toContain("asset:manage");
    expect(ROLE_PERMISSION_CODES[RoleCode.REQUESTER]).not.toContain("asset:read");
    expect(ROLE_PERMISSION_CODES[RoleCode.AGENT]).not.toContain("asset:read");
    expect(ROLE_PERMISSION_CODES[RoleCode.QUEUE_MANAGER]).not.toContain("asset:read");
    expect(ROLE_PERMISSION_CODES[RoleCode.TECHNICAL_ADMIN]).not.toContain("asset:read");
    expect(ROLE_PERMISSION_CODES[RoleCode.TECHNICAL_ADMIN]).not.toContain("asset:manage");
  });

  it("ne réactive pas un compte bootstrapé désactivé administrativement", () => {
    expect(statusAfterEntraSynchronization({
      email: DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
      administrativelyDisabled: true,
      firstSynchronization: false,
      existingStatus: UserStatus.ACTIVE,
    })).toBe(UserStatus.DISABLED);
  });
});
