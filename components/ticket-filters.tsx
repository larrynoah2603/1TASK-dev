"use client";

import { Priority, TicketStatus } from "@prisma/client";
import type { Route } from "next";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";
import type { TicketListScope, TicketListSlaFilter, TicketListSort } from "@/lib/ticket-service";
import { Combobox } from "@/components/combobox";
import { buildTicketFilterHref, buildTicketFilterPatchHref } from "@/lib/ticket-filter-navigation";

type QueueOption = {
  id: string;
  name: string;
  department: { id: string; name: string };
};

type DossierOption = { id: string; code: string; name: string; client: { name: string } };
type MissionOption = { id: string; code: string; name: string; dossier: { id: string; code: string; name: string; client: { name: string } } };

const scopeLabels: Record<TicketListScope, string> = {
  all: "Tous les tickets visibles",
  unassigned: "Tickets non affectés",
  mine: "Mes tickets affectés",
  team: "Tickets de mon équipe",
  requested: "Mes tickets",
};

export function TicketFilters({
  queues,
  dossiers = [],
  missions = [],
  values,
  resetHref = "/tickets",
  scopeOptions = ["all", "unassigned", "mine", "team", "requested"],
  compact = false,
}: {
  queues: QueueOption[];
  dossiers?: readonly DossierOption[];
  missions?: readonly MissionOption[];
  values: {
    q?: string;
    status?: TicketStatus;
    priority?: Priority;
    scope?: TicketListScope;
    sla?: TicketListSlaFilter;
    sort?: TicketListSort;
    departmentId?: string;
    queueId?: string;
    dossierId?: string;
    missionId?: string;
  };
  resetHref?: string;
  scopeOptions?: readonly TicketListScope[];
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const filterNames = compact
      ? ["q", "status", "priority", "sort", "departmentId", "queueId", "dossierId", "missionId"]
      : ["q", "scope", "status", "priority", "sla", "sort", "departmentId", "queueId", "dossierId", "missionId"];
    const nextValues = Object.fromEntries(
      filterNames.map((name) => [name, String(formData.get(name) ?? "")]),
    );
    const href = compact
      ? buildTicketFilterPatchHref(pathname, searchParams.toString(), nextValues)
      : buildTicketFilterHref(pathname, searchParams.toString(), nextValues);
    startTransition(() => router.replace(href as Route, { scroll: false }));
  }

  function handleReset() {
    startTransition(() => router.replace(resetHref as Route, { scroll: false }));
  }

  function patchFilters(nextValues: Record<string, string | undefined>) {
    const href = buildTicketFilterPatchHref(pathname, searchParams.toString(), nextValues);
    startTransition(() => router.replace(href as Route, { scroll: false }));
  }

  const departments = [...new Map(queues.map((queue) => [queue.department.id, queue.department])).values()]
    .sort((left, right) => left.name.localeCompare(right.name));
  const availableMissions = values.dossierId ? missions.filter((mission) => mission.dossier.id === values.dossierId) : missions;
  const filterStateKey = JSON.stringify(values);
  const activeAdvancedFilters = [
    values.departmentId ? {
      key: "departmentId",
      label: "Département",
      value: departments.find((department) => department.id === values.departmentId)?.name ?? "Sélectionné",
    } : null,
    values.queueId ? {
      key: "queueId",
      label: "File",
      value: queues.find((queue) => queue.id === values.queueId)?.name ?? "Sélectionnée",
    } : null,
    values.dossierId ? {
      key: "dossierId",
      label: "Dossier",
      value: dossiers.find((dossier) => dossier.id === values.dossierId)?.code ?? "Sélectionné",
    } : null,
    values.missionId ? {
      key: "missionId",
      label: "Mission",
      value: missions.find((mission) => mission.id === values.missionId)?.code ?? "Sélectionnée",
    } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  if (compact) {
    return (
      <form key={filterStateKey} aria-label="Filtres de tickets" className="filter-panel px-3 py-2" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(14rem,1fr)_minmax(10rem,0.42fr)_minmax(10rem,0.42fr)]">
            <label className="sr-only" htmlFor="ticket-search">Recherche</label>
            <input
              id="ticket-search"
              name="q"
              defaultValue={values.q}
              placeholder="Référence, objet ou description…"
              aria-label="Rechercher par référence, objet ou description"
              className="field-control"
            />
            <Combobox
              name="status"
              defaultValue={values.status ?? ""}
              placeholder="Tous les statuts"
              ariaLabel="Filtrer par statut"
              options={[{ value: "", label: "Tous les statuts" }, ...Object.values(TicketStatus).map((status) => ({ value: status, label: STATUS_LABELS[status] }))]}
            />
            <Combobox
              name="priority"
              defaultValue={values.priority ?? ""}
              placeholder="Toutes les priorités"
              ariaLabel="Filtrer par priorité"
              options={[{ value: "", label: "Toutes les priorités" }, ...Object.values(Priority).map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] }))]}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <details className="relative">
              <summary className="button-secondary min-h-10 cursor-pointer list-none">
                {"Filtres" + (activeAdvancedFilters.length ? " " + activeAdvancedFilters.length : "")}
              </summary>
              <div className="filter-panel absolute right-0 z-30 mt-2 grid w-[min(32rem,calc(100vw-2rem))] gap-3 p-4 shadow-lg sm:grid-cols-2">
                <label className="field-label">
                  Département
                  <Combobox name="departmentId" defaultValue={values.departmentId ?? ""} placeholder="Tous les départements autorisés" options={[{ value: "", label: "Tous les départements autorisés" }, ...departments.map((department) => ({ value: department.id, label: department.name }))]} />
                </label>
                <label className="field-label">
                  File
                  <Combobox name="queueId" defaultValue={values.queueId ?? ""} placeholder="Toutes les files autorisées" options={[{ value: "", label: "Toutes les files autorisées" }, ...queues.map((queue) => ({ value: queue.id, label: queue.department.name + " — " + queue.name }))]} />
                </label>
                {dossiers.length || missions.length ? (
                  <label className="field-label">
                    Dossier
                    <Combobox name="dossierId" defaultValue={values.dossierId ?? ""} placeholder="Tous les dossiers autorisés" options={[{ value: "", label: "Tous les dossiers autorisés" }, ...dossiers.map((dossier) => ({ value: dossier.id, label: dossier.client.name + " · " + dossier.code + " · " + dossier.name }))]} />
                  </label>
                ) : null}
                {missions.length ? (
                  <label className="field-label">
                    Mission
                    <Combobox name="missionId" defaultValue={values.missionId ?? ""} placeholder="Toutes les missions autorisées" options={[{ value: "", label: "Toutes les missions autorisées" }, ...availableMissions.map((mission) => ({ value: mission.id, label: mission.code + " · " + mission.name }))]} />
                  </label>
                ) : null}
                <p className="text-[11px] text-slate-400 sm:col-span-2">Départements et files restent limités à votre périmètre serveur.</p>
              </div>
            </details>

            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap text-[11px] font-semibold text-slate-500">Trier :</span>
              <Combobox
                name="sort"
                defaultValue={values.sort ?? "updated_desc"}
                ariaLabel="Trier les tickets"
                className="min-w-[11rem]"
                options={[
                  { value: "updated_desc", label: "Dernière activité" },
                  { value: "created_desc", label: "Plus récents" },
                  { value: "created_asc", label: "Plus anciens" },
                  { value: "status_asc", label: "Statut" },
                ]}
              />
            </div>

            <button type="submit" disabled={isPending} className="button-primary min-h-10 disabled:opacity-60">
              {isPending ? "Mise à jour…" : "Appliquer"}
            </button>
            <button type="button" disabled={isPending} onClick={handleReset} className="button-ghost min-h-10 text-xs disabled:opacity-60">
              Réinitialiser
            </button>
          </div>
        </div>

        {activeAdvancedFilters.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2" aria-label="Filtres avancés actifs">
            {activeAdvancedFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                onClick={() => patchFilters({ [filter.key]: "" })}
                aria-label={"Retirer le filtre " + filter.label}
              >
                {filter.label} : {filter.value} ×
              </button>
            ))}
          </div>
        ) : null}
        <span aria-live="polite" className="sr-only">{isPending ? "Actualisation des résultats…" : "Filtres prêts."}</span>
      </form>
    );
  }

  return (
    <form key={filterStateKey} aria-label="Filtres de tickets" className="filter-panel grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
      <div className="filter-heading md:col-span-2 xl:col-span-4">
        <div><p className="eyebrow">Affiner la vue</p><p className="mt-1 text-xs text-slate-500">Recherchez et réduisez la liste selon votre périmètre autorisé.</p></div>
        <span className="filter-heading-hint">{isPending ? "Mise à jour…" : "Filtres persistants dans l’URL"}</span>
      </div>
      <label className="sr-only" htmlFor="ticket-search">Recherche</label>
      <input
        id="ticket-search"
        name="q"
        defaultValue={values.q}
        placeholder="Référence, objet ou description…"
        aria-label="Rechercher par référence, objet ou description"
        className="field-control md:col-span-2"
      />
      {scopeOptions.length ? (
        <label className="field-label">
          Vue
          <Combobox name="scope" defaultValue={values.scope ?? scopeOptions[0]} options={scopeOptions.map((scope) => ({ value: scope, label: scopeLabels[scope] }))} />
        </label>
      ) : null}
      <label className="field-label">
        Statut
        <Combobox name="status" defaultValue={values.status ?? ""} placeholder="Tous les statuts" options={[{ value: "", label: "Tous les statuts" }, ...Object.values(TicketStatus).map((status) => ({ value: status, label: STATUS_LABELS[status] }))]} />
      </label>
      <label className="field-label">
        Priorité
        <Combobox name="priority" defaultValue={values.priority ?? ""} placeholder="Toutes les priorités" options={[{ value: "", label: "Toutes les priorités" }, ...Object.values(Priority).map((priority) => ({ value: priority, label: `${PRIORITY_LABELS[priority]}${priority === Priority.HIGH || priority === Priority.CRITICAL ? " — urgent" : ""}` }))]} />
      </label>
      <label className="field-label">
        SLA
        <Combobox name="sla" defaultValue={values.sla ?? ""} placeholder="Tous les SLA" options={[{ value: "", label: "Tous les SLA" }, { value: "attention", label: "SLA proche ou dépassé" }, { value: "breached", label: "SLA dépassé" }]} />
      </label>
      <label className="field-label">
        Trier par
        <Combobox name="sort" defaultValue={values.sort ?? "updated_desc"} options={[{ value: "updated_desc", label: "Dernière mise à jour" }, { value: "created_desc", label: "Plus récents" }, { value: "created_asc", label: "Plus anciens" }, { value: "status_asc", label: "Statut" }]} />
      </label>
      <label className="field-label">
        Département
        <Combobox name="departmentId" defaultValue={values.departmentId ?? ""} placeholder="Tous les départements autorisés" options={[{ value: "", label: "Tous les départements autorisés" }, ...departments.map((department) => ({ value: department.id, label: department.name }))]} />
      </label>
      <label className="field-label">
        File
        <Combobox name="queueId" defaultValue={values.queueId ?? ""} placeholder="Toutes les files autorisées" options={[{ value: "", label: "Toutes les files autorisées" }, ...queues.map((queue) => ({ value: queue.id, label: `${queue.department.name} — ${queue.name}` }))]} />
      </label>
      {dossiers.length || missions.length ? <label className="field-label">
        Dossier
        <Combobox name="dossierId" defaultValue={values.dossierId ?? ""} placeholder="Tous les dossiers autorisés" options={[{ value: "", label: "Tous les dossiers autorisés" }, ...dossiers.map((dossier) => ({ value: dossier.id, label: `${dossier.client.name} · ${dossier.code} · ${dossier.name}` }))]} />
      </label> : null}
      {missions.length ? <label className="field-label">
        Mission
        <Combobox name="missionId" defaultValue={values.missionId ?? ""} placeholder="Toutes les missions autorisées" options={[{ value: "", label: "Toutes les missions autorisées" }, ...availableMissions.map((mission) => ({ value: mission.id, label: `${mission.code} · ${mission.name}` }))]} />
      </label> : null}
      <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
        <button type="submit" disabled={isPending} className="button-primary disabled:opacity-60">{isPending ? "Mise à jour…" : "Filtrer"}</button>
        <button type="button" disabled={isPending} onClick={handleReset} className="button-ghost min-h-10 text-xs disabled:opacity-60">Réinitialiser</button>
        <span aria-live="polite" className="text-[11px] text-slate-400">{isPending ? "Actualisation des résultats…" : "Départements et files limités à votre périmètre serveur."}</span>
      </div>
    </form>
  );
}
