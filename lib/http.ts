import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ErrorWithStatus = Error & { statusCode: number };
type PrismaError = Error & { code: string };

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "AUTHENTICATION_REQUIRED"
  | "ACCESS_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_CONFLICT"
  | "HTTP_ERROR"
  | "INTERNAL_ERROR";

function jsonError(message: string, code: ApiErrorCode, status: number, traceId: string, details?: unknown) {
  return NextResponse.json(
    { error: message, code, traceId, ...(details === undefined ? {} : { details }) },
    { status, headers: { "X-Request-Id": traceId } },
  );
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return "AUTHENTICATION_REQUIRED";
  if (status === 403) return "ACCESS_DENIED";
  if (status === 404) return "RESOURCE_NOT_FOUND";
  if (status === 409) return "RESOURCE_CONFLICT";
  return "HTTP_ERROR";
}

function redactSensitive(value: string | undefined): string | undefined {
  return value
    ?.replace(/\b(password|token|secret)=([^\s&]+)/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");
}

function hasValidStatusCode(error: unknown): error is ErrorWithStatus {
  if (!(error instanceof Error) || !("statusCode" in error)) return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number"
    && Number.isInteger(statusCode)
    && statusCode >= 400
    && statusCode <= 599;
}

function isPrismaError(error: unknown): error is PrismaError {
  return error instanceof Error
    && "code" in error
    && typeof (error as { code?: unknown }).code === "string";
}

export function errorResponse(error: unknown) {
  const traceId = randomUUID();

  if (error instanceof ZodError) {
    return jsonError("Données invalides.", "VALIDATION_ERROR", 422, traceId, error.flatten());
  }

  if (error instanceof SyntaxError) {
    return jsonError("Corps JSON invalide.", "INVALID_JSON", 400, traceId);
  }

  if (hasValidStatusCode(error)) {
    return jsonError(error.message, codeForStatus(error.statusCode), error.statusCode, traceId);
  }

  if (isPrismaError(error)) {
    if (error.code === "P2002") {
      return jsonError("Cette ressource existe déjà.", "RESOURCE_CONFLICT", 409, traceId);
    }
    if (error.code === "P2025") {
      return jsonError("Ressource introuvable.", "RESOURCE_NOT_FOUND", 404, traceId);
    }
  }

  console.error(JSON.stringify({
    type: "unhandled_api_error",
    traceId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    message: redactSensitive(error instanceof Error ? error.message : String(error)),
    stack: redactSensitive(error instanceof Error ? error.stack : undefined),
  }));
  return jsonError("Une erreur inattendue est survenue.", "INTERNAL_ERROR", 500, traceId);
}
