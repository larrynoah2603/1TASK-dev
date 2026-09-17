import { describe, expect, it } from "vitest";
import { readServerEnvironment } from "@/lib/env";

describe("configuration serveur", () => {
  it("applique des valeurs par défaut bornées", () => {
    const environment = readServerEnvironment({});

    expect(environment.CACHE_ENABLED).toBe(true);
    expect(environment.OUTBOX_BATCH_SIZE).toBe(25);
    expect(environment.PERFORMANCE_SLOW_OPERATION_MS).toBe(750);
    expect(environment.SLA_MONITOR_BATCH_SIZE).toBe(100);
    expect(environment.TICKET_FTS_ENABLED).toBe(true);
  });

  it("convertit les valeurs configurées", () => {
    const environment = readServerEnvironment({
      CACHE_ENABLED: "false",
      OUTBOX_BATCH_SIZE: "10",
      PERFORMANCE_SLOW_OPERATION_MS: "1250",
      SLA_MONITOR_BATCH_SIZE: "50",
      TICKET_FTS_ENABLED: "false",
    });

    expect(environment).toMatchObject({
      CACHE_ENABLED: false,
      OUTBOX_BATCH_SIZE: 10,
      PERFORMANCE_SLOW_OPERATION_MS: 1250,
      SLA_MONITOR_BATCH_SIZE: 50,
      TICKET_FTS_ENABLED: false,
    });
  });

  it("refuse les couples Redis incomplets et les tailles hors limites", () => {
    expect(() => readServerEnvironment({ REDIS_REST_URL: "https://redis.example" }))
      .toThrow(/REDIS_REST_TOKEN/);
    expect(() => readServerEnvironment({ OUTBOX_BATCH_SIZE: "101" }))
      .toThrow(/OUTBOX_BATCH_SIZE/);
  });
});
