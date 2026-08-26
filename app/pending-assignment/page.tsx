import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { getSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function PendingAssignmentPage() {
  const user = await getSessionUserContext();
  if (!user) redirect("/signin");
  if (user.status === "ACTIVE") redirect("/dashboard");

  const displayName = user.managedDisplayName ?? user.entraDisplayName ?? user.name;

  return (
    <main className="pending-assignment-page flex min-h-screen items-center justify-center bg-[#181a20] px-4 py-10 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-2xl sm:p-10">
        <BrandMark />
        <div className="mt-9 grid h-12 w-12 place-items-center rounded-lg bg-amber-50 text-xl font-bold text-amber-700">!</div>
        <p className="eyebrow mt-7">Validation administrative</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Votre profil est en attente</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Bonjour {displayName}. Votre identité Microsoft Entra ID a bien été reconnue,
          mais l’administrateur fonctionnel doit encore compléter votre fiche 1TASK
          avant d’autoriser l’accès au tableau de bord.
        </p>
        <div className="mt-6 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <p><strong className="text-slate-900">Identité :</strong> {user.entraDisplayName ?? user.name}</p>
          <p><strong className="text-slate-900">E-mail :</strong> {user.email}</p>
          <p><strong className="text-slate-900">État :</strong> En attente d’affectation administrative</p>
        </div>
        <p className="mt-6 text-xs leading-5 text-slate-500">
          Le nom affiché, le département, le manager applicatif, le rôle, l’équipe
          et la file autorisée sont gérés exclusivement par l’administrateur.
        </p>
        <Link href="/api/auth/signout" className="button-primary mt-7">
          Se déconnecter
        </Link>
      </section>
    </main>
  );
}
