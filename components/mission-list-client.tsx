"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { Combobox } from "@/components/combobox";

type MissionRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  dueAt: string | null;
  budgetMinutes: number | null;
  worklogMinutes: number;
  department: { id: string; name: string } | null;
  dossier: { id: string; code: string; name: string; client: { id: string; code: string; name: string } };
  _count: { tickets: number; worklogs: number };
};

type ViewMode = "table" | "grid";

const missionStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  BLOCKED: "Bloquée",
  COMPLETED: "Terminée",
  ARCHIVED: "Archivée",
};

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "Non définie";
}

function formatMinutes(minutes: number) {
  if (!minutes) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours} h ${remaining.toString().padStart(2, "0")}` : `${remaining} min`;
}

function budgetPercent(mission: MissionRow) {
  if (!mission.budgetMinutes) return null;
  return Math.min(100, Math.round((mission.worklogMinutes / mission.budgetMinutes) * 100));
}

function isMissionLate(mission: MissionRow, nowTimestamp: number) {
  return Boolean(mission.dueAt && new Date(mission.dueAt).getTime() < nowTimestamp && !["COMPLETED", "ARCHIVED"].includes(mission.status));
}

export function MissionListClient({ initialMissions, nowTimestamp }: { initialMissions: MissionRow[]; nowTimestamp: number }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [dossier, setDossier] = useState("ALL");
  const [view, setView] = useState<ViewMode>("table");

  const departments = useMemo(() => [...new Map(initialMissions.filter((mission) => mission.department).map((mission) => [mission.department!.id, mission.department!])).values()], [initialMissions]);
  const dossiers = useMemo(() => [...new Map(initialMissions.map((mission) => [mission.dossier.id, mission.dossier])).values()], [initialMissions]);

  const missions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return initialMissions.filter((mission) => {
      const matchesQuery = !normalized || [mission.code, mission.name, mission.dossier.code, mission.dossier.name, mission.dossier.client.name]
        .some((value) => value.toLowerCase().includes(normalized));
      return matchesQuery
        && (status === "ALL" || mission.status === status)
        && (department === "ALL" || mission.department?.id === department)
        && (dossier === "ALL" || mission.dossier.id === dossier);
    });
  }, [department, dossier, initialMissions, query, status]);

  const totalBudget = missions.reduce((total, mission) => total + (mission.budgetMinutes ?? 0), 0);
  const totalLogged = missions.reduce((total, mission) => total + mission.worklogMinutes, 0);
  const lateMissions = missions.filter((mission) => isMissionLate(mission, nowTimestamp)).length;
  const activeMissions = missions.filter((mission) => mission.status === "ACTIVE").length;

  return (
    <>
      <section className="portfolio-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="metric-card"><p className="text-[11px] text-slate-500">Missions visibles</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{missions.length}</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Missions actives</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{activeMissions}</p></div>
        <div className={`metric-card ${lateMissions ? "border-rose-200 bg-rose-50/50" : ""}`}><p className="text-[11px] text-slate-500">Échéances dépassées</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{lateMissions}</p></div>
        <div className="metric-card"><p className="text-[11px] text-slate-500">Temps / budget</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatMinutes(totalLogged)}</p><p className="mt-1 text-[11px] text-slate-400">{totalBudget ? `sur ${formatMinutes(totalBudget)}` : "Budget non défini"}</p></div>
      </section>

      <section className="portfolio-query-panel panel p-4 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(150px,1fr))_auto] xl:items-end">
          <label className="field-label">Rechercher<input className="field-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, nom, dossier ou client…" /></label>
          <label className="field-label">Statut<Combobox value={status} onChange={setStatus} ariaLabel="Filtrer par statut" options={[{ value: "ALL", label: "Tous les statuts" }, ...Object.entries(missionStatusLabels).map(([value, label]) => ({ value, label }))]} /></label>
          <label className="field-label">Département<Combobox value={department} onChange={setDepartment} ariaLabel="Filtrer par département" options={[{ value: "ALL", label: "Tous les départements" }, ...departments.map((item) => ({ value: item.id, label: item.name }))]} /></label>
          <label className="field-label">Dossier<Combobox value={dossier} onChange={setDossier} ariaLabel="Filtrer par dossier" options={[{ value: "ALL", label: "Tous les dossiers" }, ...dossiers.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))]} /></label>
          <div className="view-toggle" aria-label="Présentation des missions"><button type="button" className={view === "table" ? "view-toggle-active" : ""} onClick={() => setView("table")} aria-pressed={view === "table"}>Tableau</button><button type="button" className={view === "grid" ? "view-toggle-active" : ""} onClick={() => setView("grid")} aria-pressed={view === "grid"}>Grille</button></div>
        </div>
      </section>

      {view === "table" ? <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><div><p className="eyebrow">Vue dense</p><h2 className="mt-1 text-base font-semibold text-slate-900">Liste des missions</h2></div><span className="text-[11px] text-slate-400">{missions.length} résultat(s)</span></div><div className="overflow-x-auto"><table className="data-table min-w-[980px]"><thead><tr><th>Mission</th><th>Dossier / client</th><th>Statut</th><th>Département</th><th>Échéance</th><th>Temps</th><th>Tickets</th><th>Budget</th></tr></thead><tbody>{missions.map((mission) => { const percent = budgetPercent(mission); return <tr key={mission.id}><td><p className="font-semibold text-slate-800">{mission.code}</p><p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{mission.name}</p></td><td><Link href={`/dossiers/${mission.dossier.id}` as Route} className="font-medium operational-link hover:underline">{mission.dossier.code}</Link><p className="mt-0.5 max-w-[210px] truncate text-xs text-slate-500">{mission.dossier.client.name}</p></td><td><span className={`status-chip status-chip-${mission.status.toLowerCase()}`}>{missionStatusLabels[mission.status] ?? mission.status}</span></td><td className="text-xs text-slate-600">{mission.department?.name ?? "Non rattaché"}</td><td className={`text-xs ${isMissionLate(mission, nowTimestamp) ? "font-semibold text-rose-700" : "text-slate-500"}`}>{formatDate(mission.dueAt)}</td><td className="text-xs text-slate-600">{formatMinutes(mission.worklogMinutes)}<p className="mt-0.5 text-[10px] text-slate-400">{mission._count.worklogs} saisie(s)</p></td><td className="font-semibold text-slate-800">{mission._count.tickets}</td><td>{percent === null ? <span className="text-xs text-slate-400">Non défini</span> : <><div className="flex items-center justify-between gap-2 text-[10px] text-slate-500"><span>{percent}%</span><span>{formatMinutes(mission.budgetMinutes ?? 0)}</span></div><div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${percent}%` }} /></div></>}</td></tr>; })}{!missions.length ? <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-500">Aucune mission ne correspond aux filtres sélectionnés.</td></tr> : null}</tbody></table></div></section> : <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{missions.map((mission) => { const percent = budgetPercent(mission); const late = isMissionLate(mission, nowTimestamp); return <article key={mission.id} className="metric-card flex min-h-[220px] flex-col"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-slate-400">{mission.code}</p><h2 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">{mission.name}</h2></div><span className={`status-chip status-chip-${mission.status.toLowerCase()}`}>{missionStatusLabels[mission.status] ?? mission.status}</span></div><div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3"><Link href={`/dossiers/${mission.dossier.id}` as Route} className="text-xs font-semibold operational-link hover:underline">{mission.dossier.code}</Link><p className="mt-1 truncate text-xs text-slate-600">{mission.dossier.client.name}</p><p className="mt-1 truncate text-[11px] text-slate-400">{mission.department?.name ?? "Département non rattaché"}</p></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Échéance</dt><dd className={late ? "mt-1 font-semibold text-rose-700" : "mt-1 font-semibold text-slate-700"}>{formatDate(mission.dueAt)}</dd></div><div><dt className="text-slate-400">Tickets</dt><dd className="mt-1 font-semibold text-slate-700">{mission._count.tickets}</dd></div><div><dt className="text-slate-400">Temps imputé</dt><dd className="mt-1 font-semibold text-slate-700">{formatMinutes(mission.worklogMinutes)}</dd></div><div><dt className="text-slate-400">Budget</dt><dd className="mt-1 font-semibold text-slate-700">{mission.budgetMinutes ? formatMinutes(mission.budgetMinutes) : "Non défini"}</dd></div></dl>{percent !== null ? <div className="mt-auto pt-4"><div className="flex justify-between text-[10px] text-slate-500"><span>Consommation</span><span>{percent}%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${percent}%` }} /></div></div> : null}</article>; })}{!missions.length ? <div className="panel p-8 text-sm text-slate-500 md:col-span-2 xl:col-span-3">Aucune mission ne correspond aux filtres sélectionnés.</div> : null}</section>}
    </>
  );
}
