"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Impossible de charger cet espace" description="Une erreur est survenue. Les actions administratives restent protégées et aucune modification partielle n’a été validée." onRetry={reset} />;
}
