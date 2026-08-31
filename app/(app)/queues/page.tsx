import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { listVisibleQueues } from "@/lib/ticket-service";
import { getSessionUserContext, roleCodes } from "@/lib/server-auth";

export default async function QueuesPage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const managerRoles: RoleCode[] = [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN];
  if (!roleCodes(user).some((role) => managerRoles.includes(role))) redirect("/inbox");
  const queues = await listVisibleQueues(user);

  return (
    <div className="space-y-6 queues-page-shell portfolio-industrial queues-industrial">
      <header className="page-header">
        <div>
          <p className="eyebrow">Responsable de file</p>
          <h1 className="mt-2">Espace responsable de file</h1>
          <p className="page-header-description mt-2">Supervisez les tickets autorisés selon la hiérarchie Département → File → Équipe → Responsable → Agent.</p>
        </div>
        <Link href="/inbox" className="button-secondary page-header-actions">Voir la boîte agent</Link>
      </header>

      <TicketViewSwitcher />

      <div className="queues-grid grid gap-3 md:grid-cols-2">
        {queues.map((queue) => (
          <Link key={queue.id} href={("/inbox?queueId=" + encodeURIComponent(queue.id)) as Route} className="metric-card metric-card-link queue-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{queue.department.name}</p>
                <h2 className="mt-1.5 text-base font-semibold text-slate-900">{queue.name}</h2>
                <p className="mt-1 font-mono text-[11px] text-slate-400">{queue.code}</p>
              </div>
              <span className="queue-status-chip rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Active</span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <div className="queue-stat rounded-lg border border-slate-100 bg-slate-50/70 p-3"><p className="text-[11px] text-slate-500">Tickets autorisés</p><p className="mt-1 text-lg font-bold text-slate-900">{queue._count.tickets}</p></div>
              <div className="queue-stat rounded-lg border border-slate-100 bg-slate-50/70 p-3"><p className="text-[11px] text-slate-500">Équipes</p><p className="mt-1 text-lg font-bold text-slate-900">{queue._count.teams}</p></div>
              <div className="queue-stat rounded-lg border border-slate-100 bg-slate-50/70 p-3"><p className="text-[11px] text-slate-500">Responsable</p><p className="mt-1 truncate text-xs font-semibold text-slate-800">{queue.manager?.name ?? "Non désigné"}</p></div>
              <div className="queue-stat queue-stat-warning rounded-lg border border-amber-100 bg-amber-50/70 p-3"><p className="text-[11px] text-amber-800">Urgents</p><p className="mt-1 text-lg font-bold text-amber-800">{queue.operationalStats.urgent}</p></div>
              <div className="queue-stat queue-stat-danger rounded-lg border border-rose-100 bg-rose-50/70 p-3"><p className="text-[11px] text-rose-800">Bloqués · SLA</p><p className="mt-1 text-lg font-bold text-rose-800">{queue.operationalStats.blocked} · {queue.operationalStats.slaAtRisk}</p></div>
            </div>
            <p className="mt-4 text-xs font-semibold text-[#4c4dba]">Ouvrir la file →</p>
          </Link>
        ))}
        {!queues.length ? <div className="panel p-8 text-sm text-slate-500">Aucune file n’est rattachée à votre périmètre de supervision.</div> : null}
      </div>
    </div>
  );
}
