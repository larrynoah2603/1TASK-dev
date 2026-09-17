import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ErrorDTO } from "@/contracts/error.dto";

type ErrorWithStatus = Error & {
  statusCode: number;
  code?: string;
  context?: Record<string, unknown>;
};
type PrismaError = Error & { code: string };

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "INVALID_IDENTIFIER"
  | "AUTHENTICATION_REQUIRED"
  | "ACCESS_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_CONFLICT"
  | "CONFIGURATION_ERROR"
  | "HTTP_ERROR"
  | "INTERNAL_ERROR";

type ApiErrorOptions = {
  message: string;
  code: ApiErrorCode;
  status: number;
  context?: Record<string, unknown>;
  traceId?: string;
};

function sanitizeContext(value: unknown, key = "", depth = 0): unknown {
  if (/password|token|secret|authorization|cookie/i.test(key)) return "[REDACTED]";
  if (depth > 5) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.map((item) => sanitizeContext(item, key, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, item]) => [nestedKey, sanitizeContext(item, nestedKey, depth + 1)]),
    );
  }
  return value;
}

function safeContext(status: number, code: ApiErrorCode, context?: Record<string, unknown>): ErrorDTO["context"] {
  return {
    status,
    category: code,
    ...(context ? { details: sanitizeContext(context) } : {}),
  };
}

/** The single response factory for every expected API error. */
export function apiErrorResponse(options: ApiErrorOptions) {
  const traceId = options.traceId ?? randomUUID();
  const body: ErrorDTO = {
    message: options.message,
    error: options.message,
    code: options.code,
    traceId,
    context: safeContext(options.status, options.code, options.context),
  };
  return NextResponse.json(body, {
    status: options.status,
    headers: { "X-Request-Id": traceId },
  });
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 400) return "INVALID_IDENTIFIER";
  if (status === 401) return "AUTHENTICATION_REQUIRED";
  if (status === 403) return "ACCESS_DENIED";
  if (status === 404) return "RESOURCE_NOT_FOUND";
  if (status === 409) return "RESOURCE_CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 503) return "CONFIGURATION_ERROR";
  return "HTTP_ERROR";
}

export function httpErrorResponse(
  message: string,
  status: number,
  context?: Record<string, unknown>,
) {
  return apiErrorResponse({ message, code: codeForStatus(status), status, context });
}

export function logServerError(
  type: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  console.error(JSON.stringify({
    type,
    errorName: error instanceof Error ? error.name : "UnknownError",
    ...(context ? { context: sanitizeContext(context) } : {}),
  }));
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

function isApiErrorCode(value: string | undefined): value is ApiErrorCode {
  return [
    "VALIDATION_ERROR", "INVALID_JSON", "INVALID_IDENTIFIER", "AUTHENTICATION_REQUIRED",
    "ACCESS_DENIED", "RESOURCE_NOT_FOUND", "RESOURCE_CONFLICT", "CONFIGURATION_ERROR",
    "HTTP_ERROR", "INTERNAL_ERROR",
  ].includes(value ?? "");
}

export function errorResponse(error: unknown) {
  const traceId = randomUUID();

  if (error instanceof ZodError) {
    return apiErrorResponse({
      message: "Données invalides.",
      code: "VALIDATION_ERROR",
      status: 422,
      traceId,
      context: { fields: error.flatten() },
    });
  }

  if (error instanceof SyntaxError) {
    return apiErrorResponse({ message: "Corps JSON invalide.", code: "INVALID_JSON", status: 400, traceId });
  }

  if (hasValidStatusCode(error)) {
    return apiErrorResponse({
      message: error.message,
      code: isApiErrorCode(error.code) ? error.code : codeForStatus(error.statusCode),
      status: error.statusCode,
      traceId,
      context: error.context,
    });
  }

  if (isPrismaError(error)) {
    if (error.code === "P2002") {
      return apiErrorResponse({ message: "Cette ressource existe déjà.", code: "RESOURCE_CONFLICT", status: 409, traceId });
    }
    if (error.code === "P2025") {
      return apiErrorResponse({ message: "Ressource introuvable.", code: "RESOURCE_NOT_FOUND", status: 404, traceId });
    }
  }

  // Logs contain only classification data. Error messages, payloads, secrets
  // and stack traces are deliberately excluded from monitoring output.
  logServerError("unhandled_api_error", error, { traceId, code: "INTERNAL_ERROR" });
  return apiErrorResponse({
    message: "Une erreur inattendue est survenue.",
    code: "INTERNAL_ERROR",
    status: 500,
    traceId,
  });
}
