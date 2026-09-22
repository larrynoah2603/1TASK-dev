import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getServerOperationMetrics,
  measureServerOperation,
  recordPrismaQuery,
  resetServerOperationMetrics,
} from "@/lib/performance";

describe("observabilité serveur", () => {
  beforeEach(() => resetServerOperationMetrics());
  afterEach(() => vi.useRealTimers());

  it("journalise une erreur sans données métier et compte les requêtes", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(measureServerOperation("tickets.list", async () => {
      recordPrismaQuery();
      throw new Error("secret qui ne doit pas être journalisé");
    }, { route: "/api/tickets", traceId: "trace-test" })).rejects.toThrow();
    const event = JSON.parse(String(warn.mock.calls[0]?.[0]));
    expect(event).toMatchObject({ operation: "tickets.list", route: "/api/tickets", traceId: "trace-test", queryCount: 1, status: "error" });
    expect(JSON.stringify(event)).not.toContain("secret qui ne doit pas être journalisé");
    warn.mockRestore();
  });

  it("émet aussi les succès rapides en JSON structuré pour les environnements multi-instances", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await measureServerOperation("inbox.ticket_page", async () => "ok", {
      route: "/inbox",
      traceId: "trace-fast-test",
      section: "critical",
      payloadBytes: 1234,
    });
    const event = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(event).toMatchObject({
      event: "server_operation",
      operation: "inbox.ticket_page",
      route: "/inbox",
      traceId: "trace-fast-test",
      section: "critical",
      payloadBytes: 1234,
      queryCount: 0,
      status: "ok",
      slow: false,
    });
    info.mockRestore();
  });

  it("agrège succès, erreurs et percentiles sans contenu sensible", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const duration of [1, 2, 3, 4, 100]) {
      await measureServerOperation("portfolio.summary", async () => {
        await vi.advanceTimersByTimeAsync(duration);
      });
    }
    await expect(measureServerOperation("portfolio.summary", async () => {
      await vi.advanceTimersByTimeAsync(200);
      throw new Error("dossier-secret");
    })).rejects.toThrow("dossier-secret");

    const metric = getServerOperationMetrics()[0];
    expect(metric).toEqual({
      operation: "portfolio.summary",
      count: 6,
      errorRate: 1 / 6,
      p50Ms: 3,
      p95Ms: 200,
      p99Ms: 200,
      sampleSize: 6,
    });
    expect(JSON.stringify(metric)).not.toContain("dossier-secret");
  });

  it("borne la fenêtre locale à 200 durées", async () => {
    vi.useFakeTimers();
    for (let duration = 1; duration <= 205; duration += 1) {
      await measureServerOperation("bounded", async () => {
        await vi.advanceTimersByTimeAsync(duration);
      });
    }
    const metric = getServerOperationMetrics()[0];
    expect(metric).toMatchObject({ count: 205, sampleSize: 200, p50Ms: 105, p95Ms: 195, p99Ms: 203 });
  });
});
