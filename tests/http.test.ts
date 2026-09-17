import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiErrorResponse, errorResponse } from "@/lib/http";

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

async function expectErrorEnvelope(response: Response, expected: Record<string, unknown>) {
  const body = await responseBody(response);
  expect(body).toMatchObject(expected);
  expect(body.message).toBe(body.error);
  expect(body.traceId).toEqual(expect.any(String));
  expect(body.context).toMatchObject({
    status: response.status,
    category: body.code,
  });
  expect(response.headers.get("X-Request-Id")).toBe(body.traceId);
}

describe("réponses d'erreur API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne les détails Zod avec le statut 422", async () => {
    const result = z.object({ title: z.string().min(5) }).safeParse({ title: "non" });
    if (result.success) throw new Error("Le jeu de test doit être invalide.");

    const response = errorResponse(result.error);

    expect(response.status).toBe(422);
    await expectErrorEnvelope(response, { error: "Données invalides.", code: "VALIDATION_ERROR" });
  });

  it("classe un corps JSON mal formé comme une erreur client", async () => {
    const response = errorResponse(new SyntaxError("Unexpected token"));

    expect(response.status).toBe(400);
    await expectErrorEnvelope(response, { error: "Corps JSON invalide.", code: "INVALID_JSON" });
  });

  it("conserve le statut et le message des erreurs métier explicites", async () => {
    const error = Object.assign(new Error("Accès refusé."), { statusCode: 403 });
    const response = errorResponse(error);

    expect(response.status).toBe(403);
    await expectErrorEnvelope(response, { error: "Accès refusé.", code: "ACCESS_DENIED" });
  });

  it("traduit les conflits Prisma sans divulguer leurs détails", async () => {
    const error = Object.assign(new Error("Unique constraint failed on apiToken"), { code: "P2002" });
    const response = errorResponse(error);

    expect(response.status).toBe(409);
    await expectErrorEnvelope(response, { error: "Cette ressource existe déjà.", code: "RESOURCE_CONFLICT" });
  });

  it("masque les erreurs internes et les pseudo-statuts invalides", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(new Error("password=secret"), { statusCode: 999 });
    const response = errorResponse(error);

    expect(response.status).toBe(500);
    await expectErrorEnvelope(response, { error: "Une erreur inattendue est survenue.", code: "INTERNAL_ERROR" });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"type":"unhandled_api_error"'));
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("password"));
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("stack"));
  });

  it("expurge les secrets du contexte exposé", async () => {
    const response = apiErrorResponse({
      message: "Requête refusée.",
      code: "ACCESS_DENIED",
      status: 403,
      context: { operation: "ticket.update", token: "secret-token", nested: { password: "secret" } },
    });
    const body = await responseBody(response);

    expect(body.context).toMatchObject({
      details: {
        operation: "ticket.update",
        token: "[REDACTED]",
        nested: { password: "[REDACTED]" },
      },
    });
  });
});
