import { UserStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
  isBootstrapFunctionalAdminEmail,
  PERMISSION_CATALOG,
  statusAfterEntraSynchronization,
} from "@/lib/identity";

describe("bootstrap administrateur 1TASK", () => {
  it("reconnaît l’adresse de l’administrateur fonctionnel du prototype", () => {
    expect(DEFAULT_BOOTSTRAP_ADMIN_EMAIL).toBe("larry.andrianina@bios-expertise.com");
    expect(isBootstrapFunctionalAdminEmail("Larry.Andrianina@Bios-Expertise.com")).toBe(true);
  });

  it("ne transforme pas une autre adresse en administrateur par défaut", () => {
    expect(isBootstrapFunctionalAdminEmail("agent@bios-expertise.com")).toBe(false);
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

  it("ne réactive pas un compte bootstrapé désactivé administrativement", () => {
    expect(statusAfterEntraSynchronization({
      email: DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
      administrativelyDisabled: true,
      firstSynchronization: false,
      existingStatus: UserStatus.ACTIVE,
    })).toBe(UserStatus.DISABLED);
  });
});
