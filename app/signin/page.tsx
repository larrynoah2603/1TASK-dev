"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

type ProviderId = "microsoft-entra-id";

const errorMessages: Record<string, string> = {
  "microsoft-entra-id":
    "Microsoft a refusé ou interrompu la connexion.",
  OAuthSignin: "Impossible de démarrer la connexion OAuth.",
  OAuthCallback: "Le retour de connexion n’a pas été validé.",
  AccessDenied: "L’accès est refusé pour ce compte.",
  PendingValidation:
    "Votre profil est en attente de validation par l’administrateur fonctionnel.",
  PendingAssignment:
    "Votre profil est en attente d’affectation par l’administrateur fonctionnel.",
  AccountDisabled: "Votre compte est désactivé. Contactez l’administrateur.",
  Configuration: "La configuration de l’authentification est incorrecte.",
};

function getCallbackUrl(value: string | null): string {
  if (!value || typeof window === "undefined") {
    return "/dashboard";
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return "/dashboard";
    }

    return `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function SignInContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<ProviderId | null>(null);

  const errorCode = searchParams.get("error");
  const errorMessage = errorCode
    ? errorMessages[errorCode] ??
      "La connexion a échoué. Veuillez réessayer."
    : null;

  const callbackUrl = getCallbackUrl(searchParams.get("callbackUrl"));

  async function handleSignIn(provider: ProviderId) {
    setLoading(provider);

    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setLoading(null);
    }
  }

  return (
    <main className="signin-shell relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-8 lg:py-10">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 left-0 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <section className="hidden lg:block">
          <BrandMark inverse />
          <p className="mt-14 max-w-xl text-sm font-bold uppercase tracking-[0.24em] text-indigo-200">Le support interne, en un seul geste</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[1.05] tracking-[-0.04em] text-white xl:text-6xl">
            Chaque demande mérite une réponse claire.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
            1TASK centralise vos incidents, demandes de service, délais SLA et échanges avec les équipes habilitées.
          </p>
          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              ["01", "Créer", "Un service du catalogue"],
              ["02", "Suivre", "Chaque étape et échéance"],
              ["03", "Résoudre", "Avec une traçabilité complète"],
            ].map(([number, title, text]) => (
              <div key={number} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <span className="text-xs font-black text-indigo-200">{number}</span>
                <p className="mt-6 text-sm font-bold text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="signin-card mx-auto w-full max-w-md rounded-2xl p-6 shadow-2xl sm:p-9">
          <div className="lg:hidden"><BrandMark /></div>
          <div className="mt-8 lg:mt-0">
            <p className="eyebrow">Accès sécurisé</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Bienvenue sur 1TASK</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Connectez-vous avec votre identité professionnelle pour accéder à votre périmètre de support.</p>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{errorMessage}</div>
          ) : null}

          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handleSignIn("microsoft-entra-id")}
            className="mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-700/15 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-sm font-black operational-link">M</span>
            {loading === "microsoft-entra-id" ? "Connexion en cours…" : "Continuer avec Microsoft Entra ID"}
          </button>

          <div className="mt-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-indigo-50 font-bold operational-link">✓</span>
            <p>Microsoft Entra ID fournit votre identité. Le nom affiché, le département et le manager applicatif sont validés exclusivement par l’administrateur fonctionnel.</p>
          </div>
          <p className="mt-6 text-center text-[11px] font-medium text-slate-400">1TASK · Service desk interne</p>
        </section>
      </div>
    </main>
  );
}

function SignInFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-white">
      Chargement de 1TASK…
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}
