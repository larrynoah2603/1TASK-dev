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
    vi.stubEnv("NEXTAUTH_URL", "https://1task.example");
    vi.stubEnv("NEXTAUTH_SECRET", "nextauth-secret-with-at-least-32-characters");
    vi.stubEnv("MICROSOFT_ENTRA_ID_CLIENT_ID", "client-id");
    vi.stubEnv("MICROSOFT_ENTRA_ID_CLIENT_SECRET", "client-secret");
    vi.stubEnv("MICROSOFT_ENTRA_ID_TENANT_ID", "tenant-id");
    vi.stubEnv("ALLOWED_EMAIL_DOMAIN", "bios-expertise.com");
    vi.stubEnv("CRON_SECRET", "cron-secret-with-at-least-32-characters");
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

  it("active un demandeur V1 éligible après résolution de son département", () => {
    expect(statusAfterEntraSynchronization({
      email: "demandeur@example.test",
      administrativelyDisabled: false,
      firstSynchronization: true,
      v1RequesterProvisioningEligible: true,
    })).toBe(UserStatus.ACTIVE);

    expect(statusAfterEntraSynchronization({
      email: "demandeur@example.test",
      administrativelyDisabled: false,
      firstSynchronization: false,
      existingStatus: UserStatus.PENDING_ASSIGNMENT,
      v1RequesterProvisioningEligible: true,
    })).toBe(UserStatus.ACTIVE);
  });

  it("ne laisse jamais le provisioning réactiver un compte désactivé", () => {
    expect(statusAfterEntraSynchronization({
      email: "demandeur@example.test",
      accountEnabled: false,
      administrativelyDisabled: false,
      firstSynchronization: true,
      v1RequesterProvisioningEligible: true,
    })).toBe(UserStatus.DISABLED);
    expect(statusAfterEntraSynchronization({
      email: "demandeur@example.test",
      administrativelyDisabled: true,
      firstSynchronization: false,
      existingStatus: UserStatus.PENDING_ASSIGNMENT,
      v1RequesterProvisioningEligible: true,
    })).toBe(UserStatus.DISABLED);
  });

  it("préserve un statut administrativement géré même sans synchronisation Entra antérieure", () => {
    expect(statusAfterEntraSynchronization({
      email: "profil.gere@example.test",
      administrativelyDisabled: false,
      firstSynchronization: true,
      existingStatus: UserStatus.ACTIVE,
    })).toBe(UserStatus.ACTIVE);
    expect(statusAfterEntraSynchronization({
      email: "profil.suspendu@example.test",
      administrativelyDisabled: false,
      firstSynchronization: true,
      existingStatus: UserStatus.DISABLED,
      v1RequesterProvisioningEligible: true,
    })).toBe(UserStatus.DISABLED);
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
