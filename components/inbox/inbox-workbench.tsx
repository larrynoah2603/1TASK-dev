"use client";

import { Priority, TicketStatus } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, List, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { Combobox } from "@/components/combobox";
import { AgentTicketTable } from "@/components/inbox/agent-ticket-table";
import { AgentTicketKanban } from "@/components/inbox/agent-ticket-kanban";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain";
import { buildTicketFilterPatchHref, buildTicketViewHref } from "@/lib/ticket-filter-navigation";
import type { TicketListScope, TicketListSlaFilter, TicketListSort } from "@/lib/ticket-service";

type QueueOption = {
  id: string;
  name: string;
  department: { id: string; name: string };
};

type DossierOption = {
  id: string;
  code: string;
  name: string;
  client: { name: string };
};

type MissionOption = {
  id: string;
  code: string;
  name: string;
  dossier: { id: string; code: string; name: string; client: { name: string } };
};

type InboxLayout = "list" | "kanban";

type InboxFilterValues = {
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

export function InboxWorkbench({
  tickets,
  claimableTicketIds,
  queues,
  dossiers = [],
  missions = [],
  values,
}: {
  tickets: DashboardTicketRow[];
  claimableTicketIds: string[];
  queues: QueueOption[];
  dossiers?: readonly DossierOption[];
  missions?: readonly MissionOption[];
  values: InboxFilterValues;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState<InboxLayout>("list");
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.toString();
  const effectiveScope = values.scope ?? "all";
  const departments = [...new Map(queues.map((queue) => [queue.department.id, queue.department])).values()]
    .sort((left, right) => left.name.localeCompare(right.name));
  const availableMissions = values.dossierId
    ? missions.filter((mission) => mission.dossier.id === values.dossierId)
    : missions;

  const scopeItems: { value: TicketListScope; label: string }[] = [
    { value: "all", label: "Tous" },
    { value: "unassigned", label: "Non affectés" },
    { value: "mine", label: "Mes tickets" },
    { value: "team", label: "Mon équipe" },
  ];

  const activeFilterCount = [
    values.status,
    values.priority,
    values.sla,
    values.departmentId,
    values.queueId,
    values.dossierId,
    values.missionId,
    values.sort && values.sort !== "updated_desc" ? values.sort : undefined,
  ].filter(Boolean).length;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextValues = Object.fromEntries(
      ["q", "status", "priority", "sla", "sort", "departmentId", "queueId", "dossierId", "missionId"]
        .map((name) => [name, String(formData.get(name) ?? "")]),
    );
    const href = buildTicketFilterPatchHref(pathname, currentSearch, nextValues);
    startTransition(() => router.replace(href as Route, { scroll: false }));
    setFiltersOpen(false);
  }

  function handleReset() {
    const href = buildTicketFilterPatchHref(pathname, currentSearch, {
      q: "",
      status: "",
      priority: "",
      sla: "",
      sort: "updated_desc",
      departmentId: "",
      queueId: "",
      dossierId: "",
      missionId: "",
    });
    startTransition(() => router.replace(href as Route, { scroll: false }));
    setFiltersOpen(false);
  }

  return (
    <section className="inbox-workbench" aria-labelledby="inbox-workbench-title">
      <header className="inbox-workbench-header">
        <div className="inbox-workbench-title">
          <div>
            <h2 id="inbox-workbench-title">Tickets</h2>
            <p>{tickets.length} résultat{tickets.length === 1 ? "" : "s"} dans cette vue</p>
          </div>
        </div>

        <div className="inbox-layout-switcher" role="group" aria-label="Mode d'affichage">
          <button
            type="button"
            className={layout === "list" ? "is-active" : ""}
            aria-pressed={layout === "list"}
            onClick={() => setLayout("list")}
            title="Vue liste"
          >
            <List aria-hidden />
            <span>Liste</span>
          </button>
          <button
            type="button"
            className={layout === "kanban" ? "is-active" : ""}
            aria-pressed={layout === "kanban"}
            onClick={() => setLayout("kanban")}
            title="Kanban en consultation uniquement"
          >
            <Columns3 aria-hidden />
            <span>Kanban</span>
          </button>
        </div>
      </header>

      <div className="inbox-command-surface">
        <nav className="inbox-scope-tabs" aria-label="Vues de travail">
          {scopeItems.map((item) => {
            const active = effectiveScope === item.value;
            const href = buildTicketViewHref(
              pathname,
              currentSearch,
              { scope: item.value === "all" ? null : item.value },
            );
            return (
              <Link
                key={item.value}
                href={href as Route}
                className={active ? "is-active" : ""}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form className="inbox-filter-form" onSubmit={handleSubmit}>
          <div className="inbox-search-box">
            <Search aria-hidden />
            <label className="ui-sr-only" htmlFor="inbox-search">Rechercher un ticket</label>
            <input
              id="inbox-search"
              name="q"
              defaultValue={values.q ?? ""}
              placeholder="Rechercher une référence, un sujet ou une description…"
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            className={filtersOpen || activeFilterCount ? "inbox-filter-trigger is-active" : "inbox-filter-trigger"}
            aria-expanded={filtersOpen}
            aria-controls="inbox-filter-panel"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal aria-hidden />
            <span>Filtres</span>
            {activeFilterCount ? <strong>{activeFilterCount}</strong> : null}
          </button>

          <button className="ui-sr-only" type="submit">Rechercher</button>

          {!filtersOpen ? (
            <>
              <input type="hidden" name="status" value={values.status ?? ""} />
              <input type="hidden" name="priority" value={values.priority ?? ""} />
              <input type="hidden" name="sla" value={values.sla ?? ""} />
              <input type="hidden" name="sort" value={values.sort ?? "updated_desc"} />
              <input type="hidden" name="departmentId" value={values.departmentId ?? ""} />
              <input type="hidden" name="queueId" value={values.queueId ?? ""} />
              <input type="hidden" name="dossierId" value={values.dossierId ?? ""} />
              <input type="hidden" name="missionId" value={values.missionId ?? ""} />
            </>
          ) : null}

          {filtersOpen ? (
            <div id="inbox-filter-panel" className="inbox-filter-panel">
              <div className="inbox-filter-panel-grid">
                <label>
                  <span>Statut</span>
                  <Combobox
                    name="status"
                    defaultValue={values.status ?? ""}
                    placeholder="Tous les statuts"
                    options={[
                      { value: "", label: "Tous les statuts" },
                      ...Object.values(TicketStatus).map((status) => ({ value: status, label: STATUS_LABELS[status] })),
                    ]}
                  />
                </label>

                <label>
                  <span>Priorité</span>
                  <Combobox
                    name="priority"
                    defaultValue={values.priority ?? ""}
                    placeholder="Toutes les priorités"
                    options={[
                      { value: "", label: "Toutes les priorités" },
                      ...Object.values(Priority).map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] })),
                    ]}
                  />
                </label>

                <label>
                  <span>SLA</span>
                  <Combobox
                    name="sla"
                    defaultValue={values.sla ?? ""}
                    placeholder="Tous les SLA"
                    options={[
                      { value: "", label: "Tous les SLA" },
                      { value: "attention", label: "À surveiller" },
                      { value: "breached", label: "Dépassé" },
                    ]}
                  />
                </label>

                <label>
                  <span>Trier par</span>
                  <Combobox
                    name="sort"
                    defaultValue={values.sort ?? "updated_desc"}
                    options={[
                      { value: "updated_desc", label: "Dernière activité" },
                      { value: "created_desc", label: "Plus récents" },
                      { value: "created_asc", label: "Plus anciens" },
                      { value: "status_asc", label: "Statut" },
                    ]}
                  />
                </label>

                <label>
                  <span>Département</span>
                  <Combobox
                    name="departmentId"
                    defaultValue={values.departmentId ?? ""}
                    placeholder="Tous les départements"
                    options={[
                      { value: "", label: "Tous les départements" },
                      ...departments.map((department) => ({ value: department.id, label: department.name })),
                    ]}
                  />
                </label>

                <label>
                  <span>File</span>
                  <Combobox
                    name="queueId"
                    defaultValue={values.queueId ?? ""}
                    placeholder="Toutes les files"
                    options={[
                      { value: "", label: "Toutes les files" },
                      ...queues.map((queue) => ({ value: queue.id, label: `${queue.department.name} — ${queue.name}` })),
                    ]}
                  />
                </label>

                {dossiers.length || missions.length ? (
                  <label>
                    <span>Dossier</span>
                    <Combobox
                      name="dossierId"
                      defaultValue={values.dossierId ?? ""}
                      placeholder="Tous les dossiers"
                      options={[
                        { value: "", label: "Tous les dossiers" },
                        ...dossiers.map((dossier) => ({
                          value: dossier.id,
                          label: `${dossier.client.name} · ${dossier.code} · ${dossier.name}`,
                        })),
                      ]}
                    />
                  </label>
                ) : <input type="hidden" name="dossierId" value="" />}

                {missions.length ? (
                  <label>
                    <span>Mission</span>
                    <Combobox
                      name="missionId"
                      defaultValue={values.missionId ?? ""}
                      placeholder="Toutes les missions"
                      options={[
                        { value: "", label: "Toutes les missions" },
                        ...availableMissions.map((mission) => ({
                          value: mission.id,
                          label: `${mission.code} · ${mission.name}`,
                        })),
                      ]}
                    />
                  </label>
                ) : <input type="hidden" name="missionId" value="" />}
              </div>

              <div className="inbox-filter-panel-actions">
                <button
                  type="button"
                  className="button-ghost"
                  disabled={isPending}
                  onClick={handleReset}
                >
                  <RotateCcw aria-hidden />
                  Réinitialiser
                </button>
                <button type="submit" className="button-primary" disabled={isPending}>
                  {isPending ? "Mise à jour…" : "Appliquer les filtres"}
                </button>
              </div>
            </div>
          ) : null}

          <span className="ui-sr-only" aria-live="polite">
            {isPending ? "Actualisation des tickets…" : "Vue prête."}
          </span>
        </form>
      </div>

      {layout === "kanban"
        ? <AgentTicketKanban tickets={tickets} />
        : <AgentTicketTable tickets={tickets} claimableTicketIds={claimableTicketIds} />}
    </section>
  );
}
