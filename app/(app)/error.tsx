"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

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

  return <section role="alert" className="ui-error-boundary"><ErrorState title="Impossible de charger cette vue" description="Les données n’ont pas pu être récupérées. Vous pouvez relancer le chargement sans quitter votre espace." onRetry={reset} /><button type="button" className="sr-only" onClick={reset}>Réessayer</button></section>;
}
