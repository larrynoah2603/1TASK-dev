import type { Profile } from "next-auth";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

export interface MicrosoftEntraIDProfile extends Profile {
  oid?: string;
  preferred_username?: string;
  picture?: string;
}

type MicrosoftEntraIDOptions = OAuthUserConfig<MicrosoftEntraIDProfile> & {
  tenantId?: string;
};

/**
 * Microsoft Entra ID provider for NextAuth v4.
 *
 * NextAuth v4 still ships its Microsoft provider under a legacy module name.
 * Keeping the provider definition here lets the application use the current
 * Microsoft Entra ID provider id and callback path without changing the
 * rest of the NextAuth v4 integration.
 */
export default function MicrosoftEntraIDProvider(
  options: MicrosoftEntraIDOptions,
): OAuthConfig<MicrosoftEntraIDProfile> {
  const tenantId = options.tenantId ?? "common";

  return {
    id: "microsoft-entra-id",
    name: "Microsoft Entra ID",
    type: "oauth",
    wellKnown: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: "openid profile email User.Read",
      },
    },
    profile(profile) {
      const email = profile.email ?? profile.preferred_username ?? null;

      return {
        id: profile.oid ?? profile.sub ?? email ?? "",
        name: profile.name ?? email,
        email,
        image: profile.picture ?? null,
      };
    },
    options,
  };
}
