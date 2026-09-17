import { describe, expect, it } from "vitest";
import { readServerEnvironment } from "@/lib/env";

const databaseEnvironment = { DATABASE_URL: "postgresql://user:pass@localhost:5432/1task" };

describe("configuration serveur", () => {
  it("applique des valeurs par défaut bornées", () => {
    const environment = readServerEnvironment(databaseEnvironment);

    expect(environment.CACHE_ENABLED).toBe(true);
    expect(environment.OUTBOX_BATCH_SIZE).toBe(25);
    expect(environment.PERFORMANCE_SLOW_OPERATION_MS).toBe(750);
    expect(environment.SLA_MONITOR_BATCH_SIZE).toBe(100);
    expect(environment.TICKET_FTS_ENABLED).toBe(true);
    expect(environment.NODE_ENV).toBe("development");
    expect(environment.ADMIN_EMAILS).toEqual([]);
  });

  it("normalise les listes d’administrateurs", () => {
    expect(readServerEnvironment({ ...databaseEnvironment, ADMIN_EMAILS: "Admin@Example.com; second@example.com" }).ADMIN_EMAILS)
      .toEqual(["admin@example.com", "second@example.com"]);
  });

  it("exige en production l’authentification Entra et les secrets", () => {
    expect(() => readServerEnvironment({ ...databaseEnvironment, NODE_ENV: "production" }))
      .toThrow(/NEXTAUTH_SECRET.*MICROSOFT_ENTRA_ID_CLIENT_ID.*CRON_SECRET/);
  });

  it("refuse une configuration Entra partielle dans tous les environnements", () => {
    expect(() => readServerEnvironment({ ...databaseEnvironment, MICROSOFT_ENTRA_ID_CLIENT_ID: "client" }))
      .toThrow(/trois variables Microsoft Entra ID/);
  });

  it("convertit les valeurs configurées", () => {
    const environment = readServerEnvironment({
      ...databaseEnvironment,
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
    expect(() => readServerEnvironment({ ...databaseEnvironment, REDIS_REST_URL: "https://redis.example" }))
      .toThrow(/REDIS_REST_TOKEN/);
    expect(() => readServerEnvironment({ ...databaseEnvironment, OUTBOX_BATCH_SIZE: "101" }))
      .toThrow(/OUTBOX_BATCH_SIZE/);
  });
});
