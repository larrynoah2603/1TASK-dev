import type { ReactNode } from "react";

export function ExportReportCard({ actions }: { actions?: ReactNode }) {
  return <div className="reporting-export-card"><div><p className="reporting-kicker">Rapport</p><strong>Exporter les données</strong><small>CSV disponible pour le périmètre autorisé.</small></div><div>{actions}</div></div>;
}
