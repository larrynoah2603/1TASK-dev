import { describe, expect, it } from "vitest";
import MicrosoftEntraIDProvider from "@/lib/microsoft-entra-id-provider";

describe("fournisseur Microsoft Entra ID", () => {
  it("expose le nouvel identifiant et le metadata endpoint Entra", () => {
    const provider = MicrosoftEntraIDProvider({
      clientId: "client-id",
      clientSecret: "client-secret",
      tenantId: "tenant-id",
    });

    expect(provider.id).toBe("microsoft-entra-id");
    expect(provider.name).toBe("Microsoft Entra ID");
    expect(provider.wellKnown).toBe(
      "https://login.microsoftonline.com/tenant-id/v2.0/.well-known/openid-configuration",
    );
  });
});
