import FilterBar from "@/components/ui/filter-bar";

export function ReportingFilters() { return <FilterBar searchPlaceholder="Rechercher dans le reporting" actions={<><button type="button" className="button-secondary">Aujourd’hui</button><button type="button" className="button-secondary">7 jours</button><button type="button" className="button-secondary">30 jours</button><button type="button" className="button-secondary">Personnalisé</button></>}><span className="reporting-filter-note">Périmètre : tickets visibles selon vos habilitations</span></FilterBar>; }
