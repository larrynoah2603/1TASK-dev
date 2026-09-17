import type { Prisma } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/db";
import { fetchEntraProfile, syncUserFromEntraProfile } from "@/lib/entra";
import MicrosoftEntraIDProvider from "@/lib/microsoft-entra-id-provider";
import { readServerEnvironment } from "@/lib/env";
import {
  getProfileEmail,
  isEmailAllowed,
  isSignInAccountAllowed,
  isSupportedAuthProvider,
} from "@/lib/auth-policy";

function createSafePrismaAdapter(): Adapter {
  const adapter = PrismaAdapter(prisma);

  return {
    ...adapter,
    async linkAccount(account: AdapterAccount) {
      // Persist only fields supported by the local Prisma Account model. This
      // keeps the Entra callback compatible with provider-specific fields.
      const data: Prisma.AccountUncheckedCreateInput = {
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      };
      return prisma.account.create({ data });
    },
  };
}

const environment = readServerEnvironment();
const providers: NextAuthOptions["providers"] = [];
const clientId = environment.MICROSOFT_ENTRA_ID_CLIENT_ID;
const clientSecret = environment.MICROSOFT_ENTRA_ID_CLIENT_SECRET;

if (clientId && clientSecret) {
  providers.push(
    MicrosoftEntraIDProvider({
      clientId,
      clientSecret,
      tenantId: environment.MICROSOFT_ENTRA_ID_TENANT_ID || "common",
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: createSafePrismaAdapter(),
  session: { strategy: "database" },
  providers,
  callbacks: {
    async signIn({ account, user, profile }) {
      if (!account || !isSupportedAuthProvider(account.provider)) return false;

      const email = getProfileEmail(user.email, profile);
      if (!email || !isEmailAllowed(email)) return false;

      // An administrator disables an identity, not merely its current email
      // address. Check both stable Entra object id and normalized email so an
      // email rename cannot create a second account and bypass suspension.
      const matchingAccounts = await prisma.user.findMany({
        where: {
          OR: [
            { entraObjectId: account.providerAccountId },
            { email: { equals: email, mode: "insensitive" } },
          ],
        },
        select: { status: true, administrativelyDisabled: true },
      });
      if (matchingAccounts.some((candidate) => !isSignInAccountAllowed(candidate))) return false;

      return Boolean(account.access_token);
    },
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "microsoft-entra-id" || !account.access_token) return;

      const profileRecord = (profile ?? {}) as Record<string, unknown>;
      const fallback = {
        id: typeof profileRecord.sub === "string" ? profileRecord.sub : undefined,
        displayName: typeof profileRecord.name === "string" ? profileRecord.name : user.name ?? undefined,
        mail: typeof profileRecord.email === "string" ? profileRecord.email : user.email ?? undefined,
        userPrincipalName:
          typeof profileRecord.preferred_username === "string"
            ? profileRecord.preferred_username
            : undefined,
        image: typeof profileRecord.picture === "string" ? profileRecord.picture : undefined,
      };
      const entraProfile = await fetchEntraProfile(account.access_token, fallback);
      const syncedEmail = getProfileEmail(entraProfile.mail, entraProfile);
      if (!syncedEmail || !isEmailAllowed(syncedEmail)) {
        throw new Error("L’adresse renvoyée par Microsoft n’est pas autorisée.");
      }
      await syncUserFromEntraProfile({ profile: entraProfile, userId: user.id });
    },
  },
  pages: { signIn: "/signin" },
  secret: environment.NEXTAUTH_SECRET,
};
