import { Skeleton } from "@/components/ui/skeleton";

export function TableLoading({ rows = 5, label = "Chargement du tableau" }: { rows?: number; label?: string }) {
  return <div className="ui-table-loading" role="status" aria-label={label}>{Array.from({ length: rows }, (_, index) => <div key={index} className="ui-table-loading-row"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 w-16" /></div>)}<span className="sr-only">{label}…</span></div>;
}
