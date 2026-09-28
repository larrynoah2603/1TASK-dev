import { TicketFilter } from "./ticket-filter";

export function TicketsToolbar({ queues, values }: { queues: Parameters<typeof TicketFilter>[0]["queues"]; values: Parameters<typeof TicketFilter>[0]["values"] }) {
  return <div className="tickets-toolbar"><div><p className="tickets-toolbar-label">Recherche et filtres</p><p className="tickets-toolbar-description">Affinez les tickets visibles dans votre périmètre.</p></div><TicketFilter queues={queues} values={values} scopeOptions={["requested"]} /></div>;
}
