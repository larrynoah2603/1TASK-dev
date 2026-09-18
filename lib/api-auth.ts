import type { UserContext } from "@/lib/server-auth";
import { AuthenticationError, requirePermission } from "@/lib/server-auth";

export type ApiClientKind = "web" | "mobile" | "partner";
export type ApiAuthenticationMethod = "session";

export type ApiPrincipal = {
  actor: UserContext;
  client: ApiClientKind;
  authenticationMethod: ApiAuthenticationMethod;
};

const API_CLIENTS = new Set<ApiClientKind>(["web", "mobile", "partner"]);

class ApiClientError extends Error {
  statusCode = 400;
  code = "INVALID_IDENTIFIER";
}

export function apiClientFromRequest(request: Request): ApiClientKind {
  const value = request.headers.get("x-1task-client")?.trim().toLowerCase() ?? "web";
  if (!API_CLIENTS.has(value as ApiClientKind)) {
    throw new ApiClientError("Le type de client API n’est pas reconnu.");
  }
  return value as ApiClientKind;
}

/**
 * Public API authentication boundary. Today every supported client uses the
 * Entra-backed NextAuth session. OAuth bearer validation can be added here
 * later without coupling routes or business services to that mechanism.
 */
export async function requireApiPermission(request: Request, permission: string): Promise<ApiPrincipal> {
  if (request.headers.has("authorization")) {
    throw new AuthenticationError("Les jetons Bearer ne sont pas encore activés sur cette API.");
  }
  return {
    actor: await requirePermission(permission),
    client: apiClientFromRequest(request),
    authenticationMethod: "session",
  };
}
