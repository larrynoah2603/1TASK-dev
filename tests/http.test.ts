import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorResponse } from "@/lib/http";

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
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
    expect(await responseBody(response)).toMatchObject({ error: "Données invalides." });
  });

  it("classe un corps JSON mal formé comme une erreur client", async () => {
    const response = errorResponse(new SyntaxError("Unexpected token"));

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({ error: "Corps JSON invalide." });
  });

  it("conserve le statut et le message des erreurs métier explicites", async () => {
    const error = Object.assign(new Error("Accès refusé."), { statusCode: 403 });
    const response = errorResponse(error);

    expect(response.status).toBe(403);
    expect(await responseBody(response)).toEqual({ error: "Accès refusé." });
  });

  it("traduit les conflits Prisma sans divulguer leurs détails", async () => {
    const error = Object.assign(new Error("Unique constraint failed on apiToken"), { code: "P2002" });
    const response = errorResponse(error);

    expect(response.status).toBe(409);
    expect(await responseBody(response)).toEqual({ error: "Cette ressource existe déjà." });
  });

  it("masque les erreurs internes et les pseudo-statuts invalides", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(new Error("password=secret"), { statusCode: 999 });
    const response = errorResponse(error);

    expect(response.status).toBe(500);
    expect(await responseBody(response)).toEqual({ error: "Une erreur inattendue est survenue." });
  });
});
