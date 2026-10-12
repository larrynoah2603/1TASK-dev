import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { TicketViewSwitcher } from "@/components/ticket-view-switcher";
import { listVisibleQueues } from "@/lib/ticket-queue-service";
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

      <TicketViewSwitcher compactLabels />

      <div className="queues-grid grid gap-3 md:grid-cols-2">
        {queues.map((queue) => (
          <Link key={queue.id} href={("/inbox?queueId=" + encodeURIComponent(queue.id)) as Route} className="metric-card metric-card-link queue-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--kit-text-2)]">{queue.department.name}</p>
                <h2 className="mt-1.5 text-base font-semibold text-[var(--kit-text)]">{queue.name}</h2>
                <p className="mt-1 font-mono text-xs text-[var(--kit-text-2)]">{queue.code}</p>
              </div>
              <span className="queue-status-chip rounded-md bg-[var(--kit-success-soft)] px-2 py-1 text-xs font-semibold text-[var(--kit-success-text)]">Active</span>
            </div>
            <p className="queue-context-line mt-3">
              {queue._count.teams} équipe{queue._count.teams === 1 ? "" : "s"} · Responsable : {queue.manager?.name ?? "Non désigné"}
            </p>
            <div className="queue-workload-strip mt-4 grid gap-2 sm:grid-cols-3" aria-label={`Charge de la file ${queue.name}`}>
              <div className="queue-stat rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface-muted)] p-3"><p className="text-xs text-[var(--kit-text-2)]">Tickets autorisés</p><p className="mt-1 text-lg font-bold text-[var(--kit-text)]">{queue._count.tickets}</p></div>
              <div className="queue-stat queue-stat-warning rounded-lg border border-[var(--kit-warning-text)] bg-[var(--kit-warning-soft)] p-3"><p className="text-xs text-[var(--kit-warning-text)]">Urgents</p><p className="mt-1 text-lg font-bold text-[var(--kit-warning-text)]">{queue.operationalStats.urgent}</p></div>
              <div className="queue-stat queue-stat-danger rounded-lg border border-[var(--kit-danger-text)] bg-[var(--kit-danger-soft)] p-3"><p className="text-xs text-[var(--kit-danger-text)]">Bloqués · SLA</p><p className="mt-1 text-lg font-bold text-[var(--kit-danger-text)]">{queue.operationalStats.blocked} · {queue.operationalStats.slaAtRisk}</p></div>
            </div>
            <p className="mt-4 text-xs font-semibold operational-link">Ouvrir la file →</p>
          </Link>
        ))}
        {!queues.length ? <div className="panel p-8 text-sm text-[var(--kit-text-2)]">Aucune file n’est rattachée à votre périmètre de supervision.</div> : null}
      </div>
    </div>
  );
}
