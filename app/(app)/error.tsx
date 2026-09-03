"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application page error", error);
  }, [error]);

  return (
    <section className="panel mx-auto max-w-2xl p-8 text-center" role="alert">
      <p className="eyebrow">Service temporairement indisponible</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Impossible de charger cette vue</h1>
      <p className="mt-3 text-sm text-slate-600">
        Les données n’ont pas pu être récupérées. Vous pouvez relancer le chargement sans quitter votre espace.
      </p>
      <button type="button" className="button-primary mt-5" onClick={reset}>
        Réessayer
      </button>
    </section>
  );
}
