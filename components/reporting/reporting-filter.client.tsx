import type { ReportingPeriod } from "@/lib/reporting-service";

const options: { value: ReportingPeriod; label: string }[] = [
  { value: "all", label: "Tout l’historique" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
];

/** GET navigation re-runs server aggregates: no decorative client-only filters. */
export function ReportingFilterClient({ period = "all" }: { period?: ReportingPeriod }) {
  return (
    <form method="get" className="reporting-filter-client" role="search" aria-label="Filtrer les indicateurs du reporting">
      <label htmlFor="reporting-period">
        <span>Période de création</span>
        <select id="reporting-period" name="period" defaultValue={period}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button type="submit" className="button-secondary">Appliquer</button>
      <p className="reporting-filter-help">Les indicateurs concernent les tickets créés dans la période choisie, selon vos habilitations. Les SLA affichés sont ceux de ces tickets.</p>
    </form>
  );
}
