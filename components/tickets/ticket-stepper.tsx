type TicketStep = { label: string; description: string };

const steps: TicketStep[] = [
  { label: "Informations", description: "Département et service" },
  { label: "Description", description: "Sujet et contexte" },
  { label: "Validation", description: "Résumé et création" },
];

export function TicketStepper() {
  return (
    <ol className="ticket-wizard-stepper" aria-label="Étapes de création du ticket">
      {steps.map((step, index) => (
        <li key={step.label} className={index === 0 ? "is-active" : ""}>
          <span className="ticket-wizard-step-number">{index + 1}</span>
          <span><strong>{step.label}</strong><small>{step.description}</small></span>
        </li>
      ))}
    </ol>
  );
}
