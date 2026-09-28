"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { InboxDetailPreview } from "@/components/inbox/inbox-detail-preview";
import { InboxFilterBar } from "@/components/inbox/inbox-filter-bar";
import { InboxHeader } from "@/components/inbox/inbox-header";
import { InboxTicketList } from "@/components/inbox/inbox-ticket-list";

type InboxPageProps = { tickets: DashboardTicketRow[]; claimableTicketIds: string[]; navigation: ReactNode; kpis: ReactNode; filters: ReactNode; pagination: ReactNode; agentPanel: ReactNode };

export function InboxPage({ tickets, claimableTicketIds, navigation, kpis, filters, pagination, agentPanel }: InboxPageProps) {
  const [selected, setSelected] = useState<DashboardTicketRow | null>(tickets[0] ?? null);
  return <div className="space-y-5">{navigation}<InboxHeader ticketCount={tickets.length} />{kpis}<InboxFilterBar>{filters}</InboxFilterBar>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="grid md:grid-cols-[minmax(17rem,38%)_minmax(0,1fr)]"><InboxTicketList tickets={tickets} selectedId={selected?.id} onSelect={setSelected} /><InboxDetailPreview ticket={selected} claimable={selected ? claimableTicketIds.includes(selected.id) : false} /></div><div className="border-t border-slate-200 p-3">{pagination}</div></div>
      {agentPanel}
    </div>
  </div>;
}
