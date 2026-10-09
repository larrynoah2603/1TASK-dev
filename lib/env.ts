import { z } from "zod";

const optionalString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.url().optional(),
);

const boundedInteger = (fallback: number, minimum: number, maximum: number) => z.preprocess(
  (value) => value === undefined || value === "" ? fallback : value,
  z.coerce.number().int().min(minimum).max(maximum),
);

const nonNegativeNumber = (fallback: number) => z.preprocess(
  (value) => value === undefined || value === "" ? fallback : value,
  z.coerce.number().min(0),
);

const emailList = z.preprocess(
  (value) => typeof value === "string"
    ? value.split(/[;,]/).map((email) => email.trim().toLowerCase()).filter(Boolean)
    : value,
  z.array(z.email()).default([]),
);

/** Unique inventory and validation policy for all server-side configuration. */
export const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PRODUCT_PROFILE: z.enum(["full", "v1"]).default("full"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  DATABASE_URL: z.url(),
  NEXTAUTH_URL: optionalUrl,
  NEXTAUTH_SECRET: optionalString,
  MICROSOFT_ENTRA_ID_CLIENT_ID: optionalString,
  MICROSOFT_ENTRA_ID_CLIENT_SECRET: optionalString,
  MICROSOFT_ENTRA_ID_TENANT_ID: optionalString,
  MICROSOFT_MAIL_TENANT_ID: optionalString,
  MICROSOFT_MAIL_CLIENT_ID: optionalString,
  MICROSOFT_MAIL_CLIENT_SECRET: optionalString,
  MICROSOFT_MAIL_SENDER: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.email().optional(),
  ),
  ALLOWED_EMAIL_DOMAIN: optionalString,
  ADMIN_EMAILS: emailList,
  CRON_SECRET: optionalString,
  RUN_DB_TESTS: z.enum(["0", "1"]).default("0").transform((value) => value === "1"),
  CACHE_ENABLED: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  OUTBOX_BATCH_SIZE: boundedInteger(25, 1, 100),
  OUTBOX_DELIVERY_TOKEN: optionalString,
  OUTBOX_DELIVERY_URL: optionalUrl,
  PRIVATE_STORAGE_URL: optionalUrl,
  PRIVATE_STORAGE_TOKEN: optionalString,
  PERFORMANCE_SLOW_OPERATION_MS: nonNegativeNumber(750),
  REDIS_REST_TOKEN: optionalString,
  REDIS_REST_URL: optionalUrl,
  SLA_MONITOR_BATCH_SIZE: boundedInteger(100, 25, 500),
  WEB_PUSH_PUBLIC_KEY: optionalString,
  WEB_PUSH_PRIVATE_KEY: optionalString,
  WEB_PUSH_SUBJECT: optionalString,
  TICKET_FTS_ENABLED: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
}).superRefine((environment, context) => {
  // Vercel intentionally withholds production-only secrets from Preview
  // deployments. Optional integrations remain disabled there; Production and
  // local runtime keep the strict fail-fast policy.
  const strictRuntime = environment.VERCEL_ENV !== "preview";

  const fullProfile = environment.PRODUCT_PROFILE === "full";

  // Dormant V1 integrations are deliberately ignored, even when stale or
  // partially configured variables remain in the deployment environment.
  if (strictRuntime && fullProfile && Boolean(environment.REDIS_REST_URL) !== Boolean(environment.REDIS_REST_TOKEN)) {
    context.addIssue({ code: "custom", path: [environment.REDIS_REST_URL ? "REDIS_REST_TOKEN" : "REDIS_REST_URL"], message: "REDIS_REST_URL et REDIS_REST_TOKEN doivent être configurées ensemble." });
  }
  if (strictRuntime && fullProfile && environment.OUTBOX_DELIVERY_TOKEN && !environment.OUTBOX_DELIVERY_URL) {
    context.addIssue({ code: "custom", path: ["OUTBOX_DELIVERY_URL"], message: "OUTBOX_DELIVERY_URL est obligatoire lorsqu’un token de livraison est configuré." });
  }
  if (strictRuntime && fullProfile && Boolean(environment.PRIVATE_STORAGE_URL) !== Boolean(environment.PRIVATE_STORAGE_TOKEN)) {
    context.addIssue({ code: "custom", path: [environment.PRIVATE_STORAGE_URL ? "PRIVATE_STORAGE_TOKEN" : "PRIVATE_STORAGE_URL"], message: "PRIVATE_STORAGE_URL et PRIVATE_STORAGE_TOKEN doivent être configurées ensemble." });
  }

  const pushValues = [environment.WEB_PUSH_PUBLIC_KEY, environment.WEB_PUSH_PRIVATE_KEY, environment.WEB_PUSH_SUBJECT];
  if (strictRuntime && pushValues.some(Boolean) && !pushValues.every(Boolean)) {
    context.addIssue({ code: "custom", path: ["WEB_PUSH_PUBLIC_KEY"], message: "Les trois variables Web Push doivent être configurées ensemble." });
  }

  const entraValues = [environment.MICROSOFT_ENTRA_ID_CLIENT_ID, environment.MICROSOFT_ENTRA_ID_CLIENT_SECRET, environment.MICROSOFT_ENTRA_ID_TENANT_ID];
  if (strictRuntime && entraValues.some(Boolean) && !entraValues.every(Boolean)) {
    context.addIssue({ code: "custom", path: ["MICROSOFT_ENTRA_ID_CLIENT_ID"], message: "Les trois variables Microsoft Entra ID doivent être configurées ensemble." });
  }

  const mailValues = [environment.MICROSOFT_MAIL_TENANT_ID, environment.MICROSOFT_MAIL_CLIENT_ID, environment.MICROSOFT_MAIL_CLIENT_SECRET, environment.MICROSOFT_MAIL_SENDER];
  if (strictRuntime && fullProfile && mailValues.some(Boolean) && !mailValues.every(Boolean)) {
    context.addIssue({ code: "custom", path: ["MICROSOFT_MAIL_TENANT_ID"], message: "Les quatre variables Microsoft Mail doivent être configurées ensemble." });
  }

  if (environment.NODE_ENV === "production" && strictRuntime) {
    const requiredProductionValues = {
      NEXTAUTH_URL: environment.NEXTAUTH_URL,
      NEXTAUTH_SECRET: environment.NEXTAUTH_SECRET,
      MICROSOFT_ENTRA_ID_CLIENT_ID: environment.MICROSOFT_ENTRA_ID_CLIENT_ID,
      MICROSOFT_ENTRA_ID_CLIENT_SECRET: environment.MICROSOFT_ENTRA_ID_CLIENT_SECRET,
      MICROSOFT_ENTRA_ID_TENANT_ID: environment.MICROSOFT_ENTRA_ID_TENANT_ID,
      ALLOWED_EMAIL_DOMAIN: environment.ALLOWED_EMAIL_DOMAIN,
      CRON_SECRET: environment.CRON_SECRET,
    };
    for (const [name, value] of Object.entries(requiredProductionValues)) {
      if (!value) context.addIssue({ code: "custom", path: [name], message: "Variable obligatoire en production." });
    }
    if (environment.NEXTAUTH_SECRET && environment.NEXTAUTH_SECRET.length < 32) {
      context.addIssue({ code: "custom", path: ["NEXTAUTH_SECRET"], message: "Le secret NextAuth doit contenir au moins 32 caractères en production." });
    }
    if (environment.CRON_SECRET && environment.CRON_SECRET.length < 32) {
      context.addIssue({ code: "custom", path: ["CRON_SECRET"], message: "Le secret des jobs doit contenir au moins 32 caractères en production." });
    }
  }
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function readServerEnvironment(source: Record<string, string | undefined> = process.env): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`).join("; ");
  throw new Error(`Configuration d’environnement invalide : ${details}`);
}
