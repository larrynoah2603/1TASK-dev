import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { getDossierForViewer } from "@/lib/production-service";
import { getSessionUserContext } from "@/lib/server-auth";

const missionStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  BLOCKED: "Bloquée",
  COMPLETED: "Terminée",
  ARCHIVED: "Archivée",
};

function formatDate(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(value) : "Non définie";
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours} h ${remaining.toString().padStart(2, "0")}` : `${remaining} min`;
}

export default async function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUserContext();
  if (!user) return null;

  let dossier;
  try {
    dossier = await getDossierForViewer(user, (await params).id);
  } catch {
    notFound();
  }
  if (!dossier) notFound();

  const totalBudget = dossier.missions.reduce((total, mission) => total + (mission.budgetMinutes ?? 0), 0);
  const activeMissions = dossier.missions.filter((mission) => mission.status === "ACTIVE").length;
  const blockedMissions = dossier.missions.filter((mission) => mission.status === "BLOCKED").length;

  return (
    <div className="space-y-5 portfolio-page portfolio-industrial portfolio-dossier-detail-page">
      <div className="portfolio-record-header">
        <Link href={"/dossiers" as Route} className="text-xs font-semibold text-[#4c4dba] hover:underline">← Retour aux dossiers</Link>
        <header className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="eyebrow">{dossier.client.code} · {dossier.code}</p>
            <h1 className="mt-1">{dossier.name}</h1>
            <p className="page-header-description mt-1">{dossier.client.name} · Dernière mise à jour le {formatDate(dossier.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dossier.confidential ? <span className="status-chip status-chip-blocked">Confidentiel</span> : <span className="status-chip status-chip-active">Actif</span>}
          </div>
        </header>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="metric-card"><p className="text-[11px] text-slate-500">Missions</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{dossier.missions.length}</p><p className="mt-1 text-[11px] text-slate-400">{activeMissions} active(s)</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Tickets liés</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{dossier.tickets.length}</p><p className="mt-1 text-[11px] text-slate-400">50 derniers affichés</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Temps imputé</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatMinutes(dossier.worklogSummary.minutes)}</p><p className="mt-1 text-[11px] text-slate-400">{dossier.worklogSummary.entries} saisie(s)</p></div>
        <div className={`metric-card ${blockedMissions ? "border-amber-200 bg-amber-50/50" : ""}`}><p className="text-[11px] text-slate-500">Budget missions</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{totalBudget ? formatMinutes(totalBudget) : "Non défini"}</p><p className="mt-1 text-[11px] text-slate-400">{blockedMissions ? `${blockedMissions} mission(s) bloquée(s)` : "Aucun blocage signalé"}</p></div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><div><p className="eyebrow">Planification</p><h2 className="mt-1 text-base font-semibold text-slate-900">Missions du dossier</h2></div><span className="text-[11px] text-slate-400">{dossier.missions.length} mission(s)</span></div>
          <div className="overflow-x-auto"><table className="data-table min-w-[680px]"><thead><tr><th>Mission</th><th>Statut</th><th>Département</th><th>Échéance</th><th>Tickets</th></tr></thead><tbody>
            {dossier.missions.map((mission) => <tr key={mission.id}><td><p className="font-semibold text-slate-800">{mission.code}</p><p className="mt-0.5 max-w-[230px] truncate text-xs text-slate-500">{mission.name}</p></td><td><span className={`status-chip status-chip-${mission.status.toLowerCase()}`}>{missionStatusLabels[mission.status] ?? mission.status}</span></td><td className="text-xs text-slate-600">{mission.department?.name ?? "Non rattaché"}</td><td className="text-xs text-slate-500">{formatDate(mission.dueAt)}</td><td className="font-semibold text-slate-800">{mission._count.tickets}<span className="ml-1 text-[11px] font-normal text-slate-400">· {mission._count.worklogs} temps</span></td></tr>)}
            {!dossier.missions.length ? <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">Aucune mission rattachée à ce dossier.</td></tr> : null}
          </tbody></table></div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><div><p className="eyebrow">Service desk</p><h2 className="mt-1 text-base font-semibold text-slate-900">Tickets liés</h2></div><Link href="/inbox" className="text-[11px] font-semibold text-[#4c4dba] hover:underline">Ouvrir la boîte agent</Link></div>
          <div className="overflow-x-auto"><table className="data-table min-w-[620px]"><thead><tr><th>Ticket</th><th>État</th><th>Priorité</th><th>File</th><th>Créé le</th></tr></thead><tbody>
            {dossier.tickets.map((ticket) => <tr key={ticket.id}><td><Link href={`/tickets/${ticket.id}`} className="font-semibold text-[#4c4dba] hover:underline">{ticket.reference}</Link><p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{ticket.title}</p></td><td><StatusBadge status={ticket.status} /></td><td><PriorityBadge priority={ticket.priority} /></td><td className="text-xs text-slate-600">{ticket.queue.name}</td><td className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</td></tr>)}
            {!dossier.tickets.length ? <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">Aucun ticket lié à ce dossier dans votre périmètre.</td></tr> : null}
          </tbody></table></div>
        </section>
      </div>

      <section className="panel p-4 sm:p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Référentiel</p><h2 className="mt-1 text-base font-semibold text-slate-900">Informations du dossier</h2></div><span className="font-mono text-[11px] text-slate-400">{dossier.id}</span></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-[11px] text-slate-500">Client</dt><dd className="mt-1 font-semibold text-slate-800">{dossier.client.name}</dd></div><div><dt className="text-[11px] text-slate-500">Code client</dt><dd className="mt-1 font-mono text-xs text-slate-800">{dossier.client.code}</dd></div><div><dt className="text-[11px] text-slate-500">Créé le</dt><dd className="mt-1 font-semibold text-slate-800">{formatDate(dossier.createdAt)}</dd></div><div><dt className="text-[11px] text-slate-500">Confidentialité</dt><dd className="mt-1 font-semibold text-slate-800">{dossier.confidential ? "Accès restreint" : "Standard"}</dd></div></dl></section>
    </div>
  );
}
