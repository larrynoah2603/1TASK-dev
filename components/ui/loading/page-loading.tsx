import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({ label = "Chargement de la page" }: { label?: string }) {
  return <div className="ui-page-loading" role="status" aria-label={label}><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-80 max-w-full" /><div className="ui-page-loading-grid"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-72 w-full" /><span className="sr-only">{label}…</span></div>;
}
