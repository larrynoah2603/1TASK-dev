export function TicketSummary() {
  return (
    <aside className="ticket-wizard-summary" aria-label="Résumé de la demande">
      <p className="eyebrow">Votre demande</p>
      <h2>Un traitement clair, de bout en bout.</h2>
      <p>Les informations saisies seront transmises à la file de qualification du département sélectionné.</p>
      <dl>
        <div><dt>Étape 1</dt><dd>Routage vers la bonne équipe</dd></div>
        <div><dt>Étape 2</dt><dd>Description du besoin</dd></div>
        <div><dt>Étape 3</dt><dd>Confirmation avant création</dd></div>
      </dl>
    </aside>
  );
}
