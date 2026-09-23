import { Skeleton } from "@/components/ui/skeleton";

export function ChartLoading({ label = "Chargement du graphique" }: { label?: string }) {
  return <div className="ui-chart-loading" role="status" aria-label={label}><Skeleton className="h-full w-full" /><span className="sr-only">{label}…</span></div>;
}
