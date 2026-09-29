import { RoleCode } from "@prisma/client";
import { hasGlobalRole } from "@/lib/access-control";
import { AuthorizationError, toAccessSubject, type UserContext } from "@/lib/server-auth";

/**
 * Asset access is intentionally narrower than the generic asset permissions.
 * Only an unscoped/global FUNCTIONAL_ADMIN can use the asset inventory.
 */
export function isFunctionalAssetAdministrator(actor: UserContext): boolean {
  return hasGlobalRole(toAccessSubject(actor), RoleCode.FUNCTIONAL_ADMIN);
}

export function assertFunctionalAssetAdministrator(actor: UserContext): void {
  if (!isFunctionalAssetAdministrator(actor)) {
    throw new AuthorizationError(
      "La gestion des actifs est réservée à l’administrateur fonctionnel global.",
    );
  }
}

/** Requests are reviewed globally: scoped roles must never expose another user's request. */
export function assertAssetRequestReviewer(actor: UserContext): void {
  if (!isFunctionalAssetAdministrator(actor)) {
    throw new AuthorizationError("La validation des demandes d’actifs est réservée à l’administrateur fonctionnel global.");
  }
}
