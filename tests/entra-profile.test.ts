import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEntraProfile } from "@/lib/entra";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";

describe("frontière Microsoft Graph", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("conserve le département Graph brut pour une résolution normalisée côté serveur", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "entra-graph-user",
        displayName: "Marie Exemple",
        mail: "marie@example.test",
        department: "  ÉXPERTISE   Comptable ",
        accountEnabled: true,
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const profile = await fetchEntraProfile("token-de-test");

    expect(profile.department).toBe("  ÉXPERTISE   Comptable ");
    expect(normalizeEntraDepartmentValue(profile.department!)).toBe("expertise comptable");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });
});
