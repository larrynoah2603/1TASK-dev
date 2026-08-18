import { RoleCode, UserStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ensureBootstrapFunctionalAdmin,
  ensureRequesterRole,
  isBootstrapFunctionalAdminEmail,
  statusAfterEntraSynchronization,
} from "@/lib/identity";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";

export interface EntraManagerProfile {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

export interface EntraProfile {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  department?: string;
  jobTitle?: string;
  accountEnabled?: boolean;
  image?: string | null;
  manager?: EntraManagerProfile | null;
}

// Microsoft Graph and the first PostgreSQL connection can both be slow during
// local development on Windows. Keep the synchronization atomic, but give the
// provisioning writes enough time to complete.
const ENTRA_SYNC_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 15_000,
} as const;

async function fetchEntraPhoto(accessToken: string): Promise<string | null | undefined> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/photos/96x96/$value", {
    headers: { Authorization: "Bearer " + accessToken },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (response.status === 403) {
    console.warn("[auth] Photo Microsoft non disponible (403). La dernière photo connue est conservée.");
    return undefined;
  }
  if (!response.ok) {
    console.warn("[auth] Photo Microsoft non disponible (" + response.status + "). La dernière photo connue est conservée.");
    return undefined;
  }

  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
  const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (!contentType || !allowedPhotoTypes.has(contentType) || (contentLength > 0 && contentLength > 128_000)) {
    console.warn("[auth] Photo Microsoft ignorée car son type ou sa taille n’est pas autorisé.");
    return undefined;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > 128_000) return undefined;
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function fetchEntraProfile(
  accessToken: string,
  fallback: Partial<EntraProfile> = {},
): Promise<EntraProfile> {
  const headers = { Authorization: "Bearer " + accessToken };
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled",
    { headers, cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Microsoft Graph a répondu " + response.status + ".");
  }

  const graphProfile = (await response.json()) as EntraProfile;
  const image = await fetchEntraPhoto(accessToken);
  let manager: EntraManagerProfile | null | undefined;
  const managerResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/manager?$select=id,displayName,mail,userPrincipalName",
    { headers, cache: "no-store" },
  );
  if (managerResponse.ok) {
    manager = (await managerResponse.json()) as EntraManagerProfile;
  } else if (managerResponse.status === 404) {
    manager = null;
  } else if (managerResponse.status !== 404 && managerResponse.status !== 403) {
    throw new Error(
      "Microsoft Graph a répondu " + managerResponse.status + " lors de la lecture du manager.",
    );
  } else {
    // User.Read.All is required by Graph for the manager relationship.
    // Missing manager access must not hide a valid primary profile login.
    console.warn("[auth] Manager Microsoft non disponible (" + managerResponse.status + ").");
  }

  return {
    ...fallback,
    ...graphProfile,
    image: image ?? graphProfile.image ?? fallback.image,
    manager,
    id: graphProfile.id ?? fallback.id ?? "",
  };
}

export async function syncUserFromEntraProfile(input: {
  profile: EntraProfile;
  userId?: string;
}): Promise<{ id: string; status: UserStatus; departmentId: string | null }> {
  const { profile, userId } = input;
  if (!profile.id) throw new Error("L’identifiant Microsoft est obligatoire.");

  const email = (profile.mail ?? profile.userPrincipalName ?? "").trim().toLowerCase();
  if (!email) throw new Error("Microsoft n’a fourni aucune adresse e-mail exploitable.");

  const entraDepartmentValue = profile.department?.trim() || null;
  const normalizedDepartment = entraDepartmentValue
    ? normalizeEntraDepartmentValue(entraDepartmentValue)
    : null;

  return prisma.$transaction(async (tx) => {
    const existingUser = userId
      ? await tx.user.findUnique({
          where: { id: userId },
          select: {
            entraManagerId: true,
            entraManagerObjectId: true,
            entraManagerDisplayName: true,
            entraManagerEmail: true,
            administrativelyDisabled: true,
            managedDisplayName: true,
            departmentId: true,
            primaryRoleCode: true,
            status: true,
            lastSyncedAt: true,
            image: true,
          },
        })
      : null;
    // Department assignment and activation are application-owned decisions.
    // The mapping remains available for legacy bootstrap screens, but a new
    // Entra identity is never activated or assigned automatically from it.
    const firstSynchronization = !existingUser?.lastSyncedAt;
    const isBootstrapAdmin = isBootstrapFunctionalAdminEmail(email);
    const status = statusAfterEntraSynchronization({
      email,
      accountEnabled: profile.accountEnabled,
      administrativelyDisabled: existingUser?.administrativelyDisabled ?? false,
      firstSynchronization,
      existingStatus: existingUser?.status,
    });

    let entraManagerId = existingUser?.entraManagerId ?? null;
    let entraManagerObjectId = existingUser?.entraManagerObjectId ?? null;
    let entraManagerDisplayName = existingUser?.entraManagerDisplayName ?? null;
    let entraManagerEmail = existingUser?.entraManagerEmail ?? null;
    if (profile.manager?.id) {
      const manager = await tx.user.findUnique({ where: { entraObjectId: profile.manager.id } });
      entraManagerId = manager?.id ?? null;
      entraManagerObjectId = profile.manager.id;
      entraManagerDisplayName = profile.manager.displayName?.trim() || null;
      entraManagerEmail = (profile.manager.mail ?? profile.manager.userPrincipalName ?? "").trim().toLowerCase() || null;
    } else if (profile.manager === null) {
      entraManagerId = null;
      entraManagerObjectId = null;
      entraManagerDisplayName = null;
      entraManagerEmail = null;
    } else if (profile.manager === undefined && existingUser) {
      // Preserve the last known manager when Graph denied the relationship
      // lookup. A 404 is represented by null and intentionally clears it.
      entraManagerId = existingUser.entraManagerId ?? null;
    }

    const entraDisplayName = profile.displayName?.trim() || email;
    const effectiveName = existingUser?.managedDisplayName?.trim() || entraDisplayName;
    const data = {
      entraObjectId: profile.id,
      entraDisplayName,
      managedDisplayName: existingUser?.managedDisplayName ?? null,
      name: effectiveName,
      email,
      entraDepartmentValue,
      entraDepartmentNormalizedValue: normalizedDepartment,
      // Preserve an application-managed department and manager. These fields
      // must never be overwritten by a later Entra synchronization.
      departmentId: existingUser?.departmentId ?? null,
      primaryRoleCode:
        existingUser?.primaryRoleCode ??
        (isBootstrapAdmin ? RoleCode.FUNCTIONAL_ADMIN : null),
      entraManagerId,
      entraManagerObjectId,
      entraManagerDisplayName,
      entraManagerEmail,
      jobTitle: profile.jobTitle?.trim() || null,
      image: profile.image !== undefined ? profile.image : existingUser?.image ?? null,
      status,
      administrativelyDisabled: existingUser?.administrativelyDisabled ?? false,
      lastSyncedAt: new Date(),
    } satisfies Prisma.UserUncheckedUpdateInput;

    const user = userId
      ? await tx.user.update({ where: { id: userId }, data })
      : await tx.user.upsert({
          where: { entraObjectId: profile.id },
          update: data,
          create: {
            entraObjectId: profile.id,
            entraDisplayName,
            managedDisplayName: null,
            name: data.name,
            email,
            entraDepartmentValue,
            entraDepartmentNormalizedValue: normalizedDepartment,
            departmentId: null,
            primaryRoleCode: isBootstrapAdmin ? RoleCode.FUNCTIONAL_ADMIN : null,
            entraManagerId,
            entraManagerObjectId,
            entraManagerDisplayName,
            entraManagerEmail,
            jobTitle: data.jobTitle,
            status,
            administrativelyDisabled: data.administrativelyDisabled,
            lastSyncedAt: new Date(),
          },
        });

    await ensureRequesterRole(tx, user.id);
    await ensureBootstrapFunctionalAdmin(tx, { userId: user.id, email });
    return { id: user.id, status: user.status, departmentId: user.departmentId };
  }, ENTRA_SYNC_TRANSACTION_OPTIONS);
}
