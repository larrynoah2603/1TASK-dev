import { Skeleton } from "@/components/ui/skeleton";

export function CardLoading({ label = "Chargement" }: { label?: string }) {
  return <div className="ui-card-loading" role="status" aria-label={label}><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-20" /><Skeleton className="h-3 w-40 max-w-full" /><span className="sr-only">{label}…</span></div>;
}
