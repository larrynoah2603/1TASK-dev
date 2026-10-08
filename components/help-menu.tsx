"use client";

import { useEffect, useMemo, useState } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icons";

type RoutingHelpEntry = {
  department: { id: string; code: string; name: string };
  queue: { id: string; name: string };
  service: { id: string; name: string; description: string | null };
  keywords: string[];
};

type HelpTab = "guide" | "routing";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function HelpMenu() {
  const [tab, setTab] = useState<HelpTab>("guide");
  const [query, setQuery] = useState("");
  const [routingEntries, setRoutingEntries] = useState<RoutingHelpEntry[]>([]);
  const [routingLoading, setRoutingLoading] = useState(true);
  const [routingError, setRoutingError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/help/routing-keywords", {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("routing-help-unavailable");
        return response.json() as Promise<RoutingHelpEntry[]>;
      })
      .then((entries) => {
        setRoutingEntries(entries);
        setRoutingError(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRoutingError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRoutingLoading(false);
      });

    return () => controller.abort();
  }, []);

  const departments = useMemo(() => {
    const search = normalizeSearch(query);
    const filtered = search
      ? routingEntries.filter((entry) => {
          const searchable = [
            entry.department.name,
            entry.department.code,
            entry.queue.name,
            entry.service.name,
            entry.service.description ?? "",
            ...entry.keywords,
          ].map(normalizeSearch);
          return searchable.some((value) => value.includes(search));
        })
      : routingEntries;

    const groups = new Map<string, { department: RoutingHelpEntry["department"]; entries: RoutingHelpEntry[] }>();
    for (const entry of filtered) {
      const current = groups.get(entry.department.id);
      if (current) current.entries.push(entry);
      else groups.set(entry.department.id, { department: entry.department, entries: [entry] });
    }
    return [...groups.values()];
  }, [query, routingEntries]);

  return (
    <Dropdown triggerLabel="Aide" triggerContent={<Icon name="help" />} panelClassName="kit-help" role="dialog">
      <div className="kit-help-header">
        <div>
          <h2>Aide 1TASK</h2>
          <p>Comprendre le parcours d’une demande et son routage.</p>
        </div>
      </div>

      <div className="kit-help-tabs" role="tablist" aria-label="Rubriques d’aide">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "guide"}
          className={tab === "guide" ? "is-active" : ""}
          onClick={() => setTab("guide")}
        >
          Guide rapide
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "routing"}
          className={tab === "routing" ? "is-active" : ""}
          onClick={() => setTab("routing")}
        >
          Mots-clés de routage
        </button>
      </div>

      {tab === "guide" ? (
        <div className="kit-help-content" role="tabpanel">
          <p><strong>Créer :</strong> décrivez votre besoin avec des termes précis. 1TASK utilise l’objet et la description pour rechercher le service le plus adapté.</p>
          <p><strong>Suivre :</strong> utilisez les filtres, le SLA et l’historique du ticket pour connaître la prochaine action.</p>
          <p><strong>Besoin d’une modification :</strong> contactez l’administrateur fonctionnel de votre département.</p>
          <div className="kit-help-note"><strong>Raccourcis :</strong> Ctrl/⌘ + K pour rechercher · Échap pour fermer les fenêtres.</div>
        </div>
      ) : (
        <div className="kit-help-routing" role="tabpanel">
          <div className="kit-help-routing-intro">
            <strong>Quelle destination pour mes mots ?</strong>
            <p>Ces mots-clés viennent directement du catalogue actif. Les utiliser aide 1TASK à identifier la destination probable, mais le routage tient compte de l’ensemble de votre demande.</p>
          </div>

          <label className="kit-help-search">
            <span className="sr-only">Rechercher un mot-clé, un service, une file ou un département</span>
            <Icon name="search" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex. wifi, imprimante, transport..."
              autoComplete="off"
            />
          </label>

          <div className="kit-help-routing-list">
            {routingLoading ? <p className="kit-help-state">Chargement des mots-clés…</p> : null}
            {!routingLoading && routingError ? <p className="kit-help-state kit-help-state-error">Les mots-clés sont momentanément indisponibles.</p> : null}
            {!routingLoading && !routingError && !departments.length ? (
              <p className="kit-help-state">Aucun mot-clé ne correspond à votre recherche.</p>
            ) : null}

            {!routingLoading && !routingError ? departments.map(({ department, entries }, index) => (
              <details key={department.id} className="kit-help-department" open={Boolean(query.trim()) || index === 0}>
                <summary>
                  <span>{department.name}</span>
                  <small>{entries.length} service{entries.length > 1 ? "s" : ""}</small>
                </summary>
                <div className="kit-help-department-body">
                  {entries.map((entry) => (
                    <article key={entry.service.id} className="kit-help-route-card">
                      <div className="kit-help-route-card-head">
                        <div>
                          <strong>{entry.service.name}</strong>
                          {entry.service.description ? <p>{entry.service.description}</p> : null}
                        </div>
                      </div>
                      <div className="kit-help-keywords" aria-label={`Mots-clés pour ${entry.service.name}`}>
                        {entry.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                      </div>
                      <div className="kit-help-destination">
                        <small>Destination probable</small>
                        <strong>{department.name} → {entry.queue.name} → {entry.service.name}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            )) : null}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
