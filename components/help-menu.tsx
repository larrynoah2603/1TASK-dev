"use client";

import { Dropdown } from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icons";

export function HelpMenu() {
  return (
    <Dropdown triggerLabel="Aide" triggerContent={<Icon name="help" />} panelClassName="kit-help" role="dialog">
      <h2>Utiliser 1TASK</h2>
      <p><strong>Créer :</strong> choisissez un service du catalogue, décrivez votre besoin puis vérifiez l’aperçu avant l’envoi.</p>
      <p><strong>Suivre :</strong> utilisez les filtres, le SLA et l’historique du ticket pour connaître la prochaine action.</p>
      <p><strong>Besoin d’une modification :</strong> contactez l’administrateur fonctionnel de votre département.</p>
      <div className="kit-help-note"><strong>Raccourcis :</strong> Ctrl/⌘ + K pour rechercher · Échap pour fermer les fenêtres.</div>
    </Dropdown>
  );
}
