import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";
type ObservabilityContext = { traceId: string };

const requestContext = new AsyncLocalStorage<ObservabilityContext>();
const SAFE_TRACE_ID = /^[a-zA-Z0-9._:-]{8,128}$/;
const TRACEPARENT = /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i;

export function sanitizeTelemetry(value: unknown, key = "", depth = 0): unknown {
  // Event names, trace ids and timing are useful; identities, personal data,
  // private media URLs, free-text descriptions and credentials are not.
  if (/password|token|secret|authorization|cookie|session|email|phone|ipaddress|filename|filepath|photo|avatar|tickettitle|requestername|recipientname|messagebody|description|endpoint/i.test(key)) {
    return "[REDACTED]";
  }
  if (depth > 5) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeTelemetry(item, key, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, 50).map(([nestedKey, item]) => [nestedKey, sanitizeTelemetry(item, nestedKey, depth + 1)]),
    );
  }
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}[TRUNCATED]`;
  return value;
}

export function traceIdFromRequest(request: Request): string {
  const requestId = request.headers.get("x-request-id")?.trim();
  if (requestId && SAFE_TRACE_ID.test(requestId)) return requestId;
  const traceparent = request.headers.get("traceparent")?.trim();
  const distributedTraceId = traceparent?.match(TRACEPARENT)?.[1];
  return distributedTraceId ?? randomUUID();
}

export function currentTraceId(): string | undefined {
  return requestContext.getStore()?.traceId;
}

export function runWithRequestTrace<T>(request: Request, operation: () => T): T {
  return requestContext.run({ traceId: traceIdFromRequest(request) }, operation);
}

/** Emits one-line JSON suitable for Vercel logs and log-drain ingestion. */
export function logTelemetry(level: LogLevel, event: string, context: Record<string, unknown> = {}) {
  const sanitizedContext = sanitizeTelemetry(context) as Record<string, unknown>;
  const payload = JSON.stringify({
    ...sanitizedContext,
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "ticketing-interne",
    traceId: currentTraceId() ?? (typeof context.traceId === "string" ? context.traceId : undefined),
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}
