import type { TicketRow } from "@/components/ticket-table";
import type { TicketFilter } from "./ticket-filter";
import { TicketsPage } from "./tickets-page";

export function TicketList({ tickets, queues, values, nextCursor, currentCursor, pageSize }: { tickets: TicketRow[]; queues: Parameters<typeof TicketFilter>[0]["queues"]; values: Parameters<typeof TicketFilter>[0]["values"]; nextCursor: string | null; currentCursor?: string; pageSize: number }) {
  return <TicketsPage tickets={tickets} queues={queues} values={values} nextCursor={nextCursor} currentCursor={currentCursor} pageSize={pageSize} />;
}
