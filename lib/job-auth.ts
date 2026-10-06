import { timingSafeEqual } from "node:crypto";
import { readServerEnvironment } from "@/lib/env";

export type JobAuthorizationFailure = {
  message: string;
  status: 401 | 403 | 503;
};

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getJobAuthorizationFailure(
  request: Request,
  configurationMessage = "Le secret du job n’est pas configuré.",
): JobAuthorizationFailure | null {
  const expected = readServerEnvironment().CRON_SECRET;
  if (!expected) {
    return { message: configurationMessage, status: 503 };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return { message: "Authentification du job requise.", status: 401 };
  }

  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) {
    return { message: "Job non autorisé.", status: 403 };
  }

  const provided = authorization.slice(prefix.length);
  if (!safeEqual(provided, expected)) {
    return { message: "Job non autorisé.", status: 403 };
  }

  return null;
}
