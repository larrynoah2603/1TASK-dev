import { Inbox } from "lucide-react";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { InboxTicketCard } from "@/components/inbox/inbox-ticket-card";

export function InboxTicketList({ tickets, selectedId, onSelect }: { tickets: DashboardTicketRow[]; selectedId?: string; onSelect: (ticket: DashboardTicketRow) => void }) {
  return <section aria-label="Tickets de la file" className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white lg:max-h-[720px]">
    {tickets.length ? tickets.map((ticket) => <InboxTicketCard key={ticket.id} ticket={ticket} selected={selectedId === ticket.id} onSelect={() => onSelect(ticket)} />) : <div className="grid min-h-72 place-items-center p-8 text-center"><div><Inbox className="mx-auto size-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">File à jour</p><p className="mt-1 text-xs text-slate-500">Aucun ticket ne correspond à ces critères.</p></div></div>}
  </section>;
}
