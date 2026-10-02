import { afterEach, describe, expect, it, vi } from "vitest";
import { RoleCode, UserStatus } from "@prisma/client";
import {
  fetchEntraProfile,
  isFirstEntraSynchronization,
} from "@/lib/entra";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";

describe("frontière Microsoft Graph", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("conserve le département Graph brut pour une résolution normalisée côté serveur", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "entra-graph-user",
        displayName: "Marie Exemple",
        mail: "marie@example.test",
        department: "  ÉXPERTISE   Comptable ",
        accountEnabled: true,
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const profile = await fetchEntraProfile("token-de-test");

    expect(profile.department).toBe("  ÉXPERTISE   Comptable ");
    expect(normalizeEntraDepartmentValue(profile.department!)).toBe("expertise comptable");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });

  it("distingue un vrai premier login d’un profil déjà géré sans lastSyncedAt", () => {
    type ExistingUser = NonNullable<Parameters<typeof isFirstEntraSynchronization>[0]>;
    const unmanagedPending = {
      id: "pending",
      entraManagerId: null,
      entraManagerObjectId: null,
      entraManagerDisplayName: null,
      entraManagerEmail: null,
      administrativelyDisabled: false,
      managedDisplayName: null,
      departmentId: null,
      managerId: null,
      primaryRoleCode: null,
      primaryTeamId: null,
      authorizedQueueId: null,
      status: UserStatus.PENDING_ASSIGNMENT,
      lastSyncedAt: null,
      image: null,
    } satisfies ExistingUser;

    expect(isFirstEntraSynchronization(null)).toBe(true);
    expect(isFirstEntraSynchronization(unmanagedPending)).toBe(true);
    expect(isFirstEntraSynchronization({
      ...unmanagedPending,
      id: "managed",
      managedDisplayName: "Nom administré",
      departmentId: "department-1",
      primaryRoleCode: RoleCode.AGENT,
      status: UserStatus.ACTIVE,
    })).toBe(false);
    expect(isFirstEntraSynchronization({
      ...unmanagedPending,
      id: "already-synced",
      lastSyncedAt: new Date("2026-10-01T10:00:00.000Z"),
    })).toBe(false);
  });
});
