"use client";

import { Priority, TicketStatus } from "@prisma/client";
import type { Route } from "next";
import { useState, useTransition } from "react";
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
  const [compactPanelOpen, setCompactPanelOpen] = useState(false);

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
    setCompactPanelOpen(false);
  }

  function handleReset() {
    setCompactPanelOpen(false);
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
  const advancedCount = [values.departmentId, values.queueId, values.dossierId, values.missionId].filter(Boolean).length;
  const departmentName = departments.find((department) => department.id === values.departmentId)?.name;
  const queueName = queues.find((queue) => queue.id === values.queueId)?.name;
  const dossierName = dossiers.find((dossier) => dossier.id === values.dossierId)?.code;
  const missionName = missions.find((mission) => mission.id === values.missionId)?.code;

  if (compact) {
    return (
      <form
        key={filterStateKey}
        aria-label="Filtres de tickets"
        className="ticket-filters-compact border-y border-[var(--kit-border)] bg-[var(--kit-glass)] px-3 py-2"
        data-compact-filters-open={compactPanelOpen ? "true" : "false"}
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="scope" value={values.scope ?? "all"} />
        <input type="hidden" name="sla" value={values.sla ?? ""} />

        <div className="ticket-filters-compact-grid">
          <div className="ticket-filter-search">
            <label className="sr-only" htmlFor="ticket-search-compact">Recherche</label>
            <input
              id="ticket-search-compact"
              name="q"
              defaultValue={values.q}
              placeholder="Référence, objet ou description…"
              aria-label="Rechercher par référence, objet ou description"
              className="field-control"
            />
          </div>

          <div className="ticket-filter-quick ticket-filter-status">
            <label className="sr-only" htmlFor="ticket-status-compact">Statut</label>
            <Combobox
              id="ticket-status-compact"
              name="status"
              defaultValue={values.status ?? ""}
              placeholder="Tous les statuts"
              options={[{ value: "", label: "Tous les statuts" }, ...Object.values(TicketStatus).map((status) => ({ value: status, label: STATUS_LABELS[status] }))]}
            />
          </div>

          <div className="ticket-filter-quick ticket-filter-priority">
            <label className="sr-only" htmlFor="ticket-priority-compact">Priorité</label>
            <Combobox
              id="ticket-priority-compact"
              name="priority"
              defaultValue={values.priority ?? ""}
              placeholder="Toutes les priorités"
              options={[{ value: "", label: "Toutes les priorités" }, ...Object.values(Priority).map((priority) => ({ value: priority, label: `${PRIORITY_LABELS[priority]}${priority === Priority.HIGH || priority === Priority.CRITICAL ? " — urgent" : ""}` }))]}
            />
          </div>

          <button
            type="button"
            className="ticket-filter-more button-secondary flex min-h-10 items-center justify-center gap-2 whitespace-nowrap px-3 text-xs"
            aria-expanded={compactPanelOpen}
            aria-controls="ticket-filters-compact-panel"
            onClick={() => setCompactPanelOpen((open) => !open)}
          >
            Filtres{advancedCount ? ` (${advancedCount})` : ""}
          </button>

          <div className="ticket-filter-quick ticket-filter-sort">
            <label className="sr-only" htmlFor="ticket-sort-compact">Trier par</label>
            <Combobox
              id="ticket-sort-compact"
              name="sort"
              defaultValue={values.sort ?? "updated_desc"}
              options={[
                { value: "updated_desc", label: "Dernière activité" },
                { value: "created_desc", label: "Plus récents" },
                { value: "created_asc", label: "Plus anciens" },
                { value: "status_asc", label: "Statut" },
              ]}
            />
          </div>

          <button type="submit" disabled={isPending} className="ticket-filter-apply button-primary min-h-10 px-4 text-xs disabled:opacity-60">
            {isPending ? "…" : "Appliquer"}
          </button>
        </div>

        {!compactPanelOpen ? (
          <>
            <input type="hidden" name="departmentId" value={values.departmentId ?? ""} />
            <input type="hidden" name="queueId" value={values.queueId ?? ""} />
            <input type="hidden" name="dossierId" value={values.dossierId ?? ""} />
            <input type="hidden" name="missionId" value={values.missionId ?? ""} />
          </>
        ) : null}

        {compactPanelOpen ? (
          <div id="ticket-filters-compact-panel" className="ticket-filters-compact-panel">
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
            </label> : <input type="hidden" name="dossierId" value="" />}
            {missions.length ? <label className="field-label">
              Mission
              <Combobox name="missionId" defaultValue={values.missionId ?? ""} placeholder="Toutes les missions autorisées" options={[{ value: "", label: "Toutes les missions autorisées" }, ...availableMissions.map((mission) => ({ value: mission.id, label: `${mission.code} · ${mission.name}` }))]} />
            </label> : <input type="hidden" name="missionId" value="" />}
            <div className="ticket-filters-compact-panel-actions">
              <button type="button" disabled={isPending} onClick={handleReset} className="button-ghost min-h-9 text-xs disabled:opacity-60">Réinitialiser</button>
              <button type="submit" disabled={isPending} className="button-primary min-h-9 px-4 text-xs disabled:opacity-60">{isPending ? "Mise à jour…" : "Appliquer"}</button>
            </div>
          </div>
        ) : null}

        {advancedCount ? (
          <div className="ticket-filter-active-chips mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {departmentName ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">Département : {departmentName}</span> : null}
            {queueName ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">File : {queueName}</span> : null}
            {dossierName ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">Dossier : {dossierName}</span> : null}
            {missionName ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">Mission : {missionName}</span> : null}
            <button type="button" disabled={isPending} onClick={handleReset} className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-60">Réinitialiser</button>
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
