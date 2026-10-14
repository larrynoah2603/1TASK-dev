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
    <main className="pending-assignment-page pending-industrial flex min-h-screen items-center justify-center bg-[var(--kit-bg)] px-4 py-10 text-[var(--kit-text)]">
      <section className="w-full max-w-xl rounded-2xl bg-[var(--kit-card)] p-7 shadow-2xl sm:p-10">
        <BrandMark />
        <div className="mt-9 grid h-12 w-12 place-items-center rounded-lg bg-[var(--kit-warning-soft)] text-xl font-bold text-[var(--kit-warning-text)]">!</div>
        <p className="eyebrow mt-7">Validation administrative requise</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--kit-text)]">Votre profil est en attente</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--kit-text-2)]">
          Bonjour {displayName}. Votre identité Microsoft Entra ID a bien été reconnue.
          Votre accès métier reste en attente jusqu’à ce qu’un administrateur fonctionnel
          valide votre département, votre rôle et votre périmètre 1TASK.
        </p>
        <div className="mt-6 grid gap-3 rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface-muted)] p-4 text-sm text-[var(--kit-text-2)]">
          <p><strong className="text-[var(--kit-text)]">Identité :</strong> {user.entraDisplayName ?? user.name}</p>
          <p><strong className="text-[var(--kit-text)]">E-mail :</strong> {user.email}</p>
          <p><strong className="text-[var(--kit-text)]">État :</strong> En attente d’affectation administrative</p>
        </div>
        <p className="mt-6 text-xs leading-5 text-[var(--kit-secondary)]">
          Les informations Entra servent à identifier le compte. Elles n’activent pas
          automatiquement un département, un rôle, une équipe ou une file dans 1TASK.
        </p>
        <Link href="/api/auth/signout" className="button-primary mt-7">
          Se déconnecter
        </Link>
      </section>
    </main>
  );
}
