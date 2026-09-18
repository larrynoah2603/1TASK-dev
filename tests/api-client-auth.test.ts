import { describe, expect, it } from "vitest";
import { apiClientFromRequest } from "@/lib/api-auth";
import { withPublicApiV1 } from "@/lib/public-api";

describe("frontière des clients API", () => {
  it("identifie les clients web, mobile et partenaires sans leur faire confiance pour les permissions", () => {
    expect(apiClientFromRequest(new Request("https://example.test/api/v1"))).toBe("web");
    expect(apiClientFromRequest(new Request("https://example.test/api/v1", {
      headers: { "X-1TASK-Client": "mobile" },
    }))).toBe("mobile");
    expect(apiClientFromRequest(new Request("https://example.test/api/v1", {
      headers: { "X-1TASK-Client": "partner" },
    }))).toBe("partner");
    expect(() => apiClientFromRequest(new Request("https://example.test/api/v1", {
      headers: { "X-1TASK-Client": "unknown" },
    }))).toThrow("type de client API");
  });

  it("annonce systématiquement la version majeure du contrat", async () => {
    const handler = withPublicApiV1("/api/v1/test", async () => Response.json({ ok: true }));
    const response = await handler(new Request("https://example.test/api/v1/test"), undefined);

    expect(response.headers.get("X-API-Version")).toBe("1");
    expect(response.headers.get("Vary")).toContain("X-1TASK-Client");
  });
});
