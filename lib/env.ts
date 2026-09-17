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

export const serverEnvironmentSchema = z.object({
  CACHE_ENABLED: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  OUTBOX_BATCH_SIZE: boundedInteger(25, 1, 100),
  OUTBOX_DELIVERY_TOKEN: optionalString,
  OUTBOX_DELIVERY_URL: optionalUrl,
  PERFORMANCE_SLOW_OPERATION_MS: nonNegativeNumber(750),
  REDIS_REST_TOKEN: optionalString,
  REDIS_REST_URL: optionalUrl,
  SLA_MONITOR_BATCH_SIZE: boundedInteger(100, 25, 500),
  TICKET_FTS_ENABLED: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
}).superRefine((environment, context) => {
  if (Boolean(environment.REDIS_REST_URL) !== Boolean(environment.REDIS_REST_TOKEN)) {
    context.addIssue({
      code: "custom",
      path: [environment.REDIS_REST_URL ? "REDIS_REST_TOKEN" : "REDIS_REST_URL"],
      message: "REDIS_REST_URL et REDIS_REST_TOKEN doivent être configurées ensemble.",
    });
  }
  if (environment.OUTBOX_DELIVERY_TOKEN && !environment.OUTBOX_DELIVERY_URL) {
    context.addIssue({
      code: "custom",
      path: ["OUTBOX_DELIVERY_URL"],
      message: "OUTBOX_DELIVERY_URL est obligatoire lorsqu’un token de livraison est configuré.",
    });
  }
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function readServerEnvironment(
  source: Record<string, string | undefined> = process.env,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Configuration d’environnement invalide : ${details}`);
}
