"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export function ErrorState({ title = "Impossible de charger cette section", description = "Une erreur inattendue est survenue. Réessayez ou contactez le support si le problème persiste.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <div className="ui-error-state" role="alert"><AlertCircle aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p>{onRetry ? <button type="button" className="button-secondary" onClick={onRetry}><RefreshCw aria-hidden="true" />Réessayer</button> : null}</div></div>;
}
