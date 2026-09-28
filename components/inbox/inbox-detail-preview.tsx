import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Building2, Clock3, UserRound } from "lucide-react";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { ClaimTicketButton } from "@/components/claim-ticket-button";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";

export function InboxDetailPreview({ ticket, claimable }: { ticket: DashboardTicketRow | null; claimable: boolean }) {
  if (!ticket) return <section className="hidden min-h-[520px] place-items-center bg-slate-50/50 p-8 text-center md:grid"><div><p className="text-sm font-semibold text-slate-700">Sélectionnez un ticket</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Son contexte, son SLA et son affectation apparaîtront ici sans quitter votre file.</p></div></section>;
  return <section aria-label={`Aperçu de ${ticket.reference}`} className="min-w-0 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-teal-700">{ticket.reference}</span><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
    <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">{ticket.title}</h2>
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Engagement SLA</p><div className="mt-2"><SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} /></div></div>
    <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
      <div className="flex items-center gap-3 py-4"><UserRound className="size-4 text-slate-400" /><dt className="text-xs text-slate-500">Demandeur</dt><dd className="ml-auto text-right text-sm font-semibold text-slate-800">{ticket.requester.name}</dd></div>
      <div className="flex items-center gap-3 py-4"><Building2 className="size-4 text-slate-400" /><dt className="text-xs text-slate-500">File</dt><dd className="ml-auto text-right text-sm font-semibold text-slate-800">{ticket.queue.name}</dd></div>
      <div className="flex items-center gap-3 py-4"><Clock3 className="size-4 text-slate-400" /><dt className="text-xs text-slate-500">Affectation</dt><dd className="ml-auto text-right text-sm font-semibold text-slate-800">{ticket.assignedTo?.name ?? "Non affecté"}</dd></div>
    </dl>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">{claimable ? <ClaimTicketButton ticketId={ticket.id} /> : null}<Link href={`/tickets/${ticket.id}` as Route} className="button-primary flex-1">Ouvrir le ticket <ArrowUpRight className="size-4" /></Link></div>
  </section>;
}
