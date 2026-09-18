import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrorResponse, withApiObservability } from "@/lib/http";
import { resetServerOperationMetrics, getServerOperationMetrics } from "@/lib/performance";
import { logTelemetry, traceIdFromRequest } from "@/lib/observability";

describe("observabilité de production", () => {
  beforeEach(() => resetServerOperationMetrics());
  afterEach(() => vi.restoreAllMocks());

  it("propage un identifiant de requête valide jusque dans l’erreur et les en-têtes", async () => {
    const handler = withApiObservability("/api/test", async () => apiErrorResponse({
      message: "Accès refusé.",
      code: "ACCESS_DENIED",
      status: 403,
    }));
    const response = await handler(new Request("https://example.test/api/test", {
      headers: { "x-request-id": "request-production-123" },
    }), undefined);
    const body = await response.json();

    expect(body.traceId).toBe("request-production-123");
    expect(response.headers.get("X-Request-Id")).toBe("request-production-123");
    expect(response.headers.get("Server-Timing")).toMatch(/^app;dur=\d+\.\d$/);
    expect(getServerOperationMetrics()).toEqual([
      expect.objectContaining({ operation: "http.get /api/test", count: 1, errorRate: 0 }),
    ]);
  });

  it("adopte le trace W3C et rejette un identifiant de requête dangereux", () => {
    const request = new Request("https://example.test/api/test", {
      headers: {
        "x-request-id": "<script>",
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    });
    expect(traceIdFromRequest(request)).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("journalise en JSON structuré sans secrets ni contenus démesurés", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logTelemetry("info", "deployment_ready", {
      password: "secret",
      payload: "x".repeat(600),
    });
    const event = JSON.parse(String(info.mock.calls[0]?.[0]));

    expect(event).toMatchObject({
      level: "info",
      event: "deployment_ready",
      service: "ticketing-interne",
      password: "[REDACTED]",
    });
    expect(event.timestamp).toEqual(expect.any(String));
    expect(event.payload).toHaveLength(511);
    expect(JSON.stringify(event)).not.toContain("secret");
  });

  it("classe les réponses serveur comme erreurs dans les métriques", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const handler = withApiObservability("/api/test", async () => new Response(null, { status: 503 }));
    await handler(new Request("https://example.test/api/test"), undefined);

    expect(getServerOperationMetrics()[0]).toMatchObject({ count: 1, errorRate: 1 });
  });
});
