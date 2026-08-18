"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Administration</p>
      <h1 className="mt-2 text-2xl font-bold text-rose-950">Impossible de charger cet espace</h1>
      <p className="mt-2 text-sm leading-6 text-rose-800">Une erreur est survenue. Les actions administratives restent protégées et aucune modification partielle n’a été validée.</p>
      <button onClick={() => reset()} className="button-danger mt-5">Réessayer</button>
    </div>
  );
}
