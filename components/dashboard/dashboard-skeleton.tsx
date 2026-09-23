import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

export function DashboardSkeleton() { return <div className="dashboard-enterprise-skeleton" aria-label="Chargement du dashboard"><div className="dashboard-skeleton-kpis">{Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)}</div><SkeletonTable columns={7} /><div className="dashboard-skeleton-bottom"><SkeletonCard /><SkeletonCard /></div></div>; }
