import { NewTicketForm } from "@/components/new-ticket-form";
import { TicketStepper } from "@/components/tickets/ticket-stepper";
import { TicketSummary } from "@/components/tickets/ticket-summary";

export function TicketWizard({ simplified = false }: { simplified?: boolean }) {
  return (
    <div className="ticket-wizard">
      <div className="ticket-wizard-intro">
        <div><p className="eyebrow">Service Desk · Nouvelle demande</p><h1>Créer un ticket</h1><p>Décrivez votre besoin en quelques étapes, puis vérifiez les informations avant l&apos;envoi.</p></div>
        <TicketStepper />
      </div>
      <div className="ticket-wizard-layout">
        <NewTicketForm simplified={simplified} />
        <TicketSummary />
      </div>
    </div>
  );
}
