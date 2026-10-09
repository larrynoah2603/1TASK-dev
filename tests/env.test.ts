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

  it("refuse une configuration Entra partielle hors Preview Vercel", () => {
    expect(() => readServerEnvironment({ ...databaseEnvironment, MICROSOFT_ENTRA_ID_CLIENT_ID: "client" }))
      .toThrow(/trois variables Microsoft Entra ID/);
  });

  it("valide la configuration Microsoft Mail comme un ensemble indivisible", () => {
    expect(() => readServerEnvironment({ ...databaseEnvironment, MICROSOFT_MAIL_CLIENT_ID: "mail-client" }))
      .toThrow(/quatre variables Microsoft Mail/);
    expect(readServerEnvironment({
      ...databaseEnvironment,
      MICROSOFT_MAIL_TENANT_ID: "mail-tenant",
      MICROSOFT_MAIL_CLIENT_ID: "mail-client",
      MICROSOFT_MAIL_CLIENT_SECRET: "mail-secret",
      MICROSOFT_MAIL_SENDER: "notifications@example.com",
    })).toMatchObject({ MICROSOFT_MAIL_TENANT_ID: "mail-tenant", MICROSOFT_MAIL_SENDER: "notifications@example.com" });
  });

  it("autorise une Preview Vercel sans secrets réservés à la production", () => {
    const environment = readServerEnvironment({
      ...databaseEnvironment,
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
    });

    expect(environment.VERCEL_ENV).toBe("preview");
    expect(environment.NEXTAUTH_SECRET).toBeUndefined();
    expect(environment.CRON_SECRET).toBeUndefined();
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

  it("ignore les configurations partielles des intégrations encore dormantes en V1", () => {
    expect(() => readServerEnvironment({
      ...databaseEnvironment,
      PRODUCT_PROFILE: "v1",
      REDIS_REST_URL: "https://stale-redis.example",
      PRIVATE_STORAGE_TOKEN: "stale-token",
      MICROSOFT_MAIL_CLIENT_ID: "stale-mail-client",
      OUTBOX_DELIVERY_TOKEN: "stale-outbox-token",
    })).not.toThrow();
  });

  it("valide Web Push comme une intégration active en V1", () => {
    expect(() => readServerEnvironment({
      ...databaseEnvironment,
      PRODUCT_PROFILE: "v1",
      WEB_PUSH_PUBLIC_KEY: "partial-public-key",
    })).toThrow(/trois variables Web Push/);

    expect(() => readServerEnvironment({
      ...databaseEnvironment,
      PRODUCT_PROFILE: "v1",
      WEB_PUSH_PUBLIC_KEY: "public-key",
      WEB_PUSH_PRIVATE_KEY: "private-key",
      WEB_PUSH_SUBJECT: "mailto:notifications@example.com",
    })).not.toThrow();
  });

  it("conserve la validation stricte des intégrations pour le profil complet", () => {
    expect(() => readServerEnvironment({
      ...databaseEnvironment,
      PRODUCT_PROFILE: "full",
      PRIVATE_STORAGE_TOKEN: "partial",
    })).toThrow(/PRIVATE_STORAGE_URL/);
  });
});
