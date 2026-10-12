import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Building2, Clock3, UserRound } from "lucide-react";
import type { DashboardTicketRow } from "@/components/dashboard-visuals";
import { ClaimTicketButton } from "@/components/claim-ticket-button";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";

export function InboxDetailPreview({ ticket, claimable }: { ticket: DashboardTicketRow | null; claimable: boolean }) {
  if (!ticket) return <section className="hidden min-h-[520px] place-items-center bg-[var(--kit-surface-muted)] p-8 text-center md:grid"><div><p className="text-sm font-semibold text-[var(--kit-text)]">Sélectionnez un ticket</p><p className="mt-1 max-w-xs text-xs leading-5 text-[var(--kit-text-2)]">Son contexte, son SLA et son affectation apparaîtront ici sans quitter votre file.</p></div></section>;
  return <section aria-label={`Aperçu de ${ticket.reference}`} className="min-w-0 bg-[var(--kit-card)] p-5 sm:p-6">
    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-[var(--kit-primary-text)]">{ticket.reference}</span><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
    <h2 className="mt-4 text-xl font-bold tracking-tight text-[var(--kit-text)]">{ticket.title}</h2>
    <div className="mt-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-surface-muted)] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--kit-text-2)]">Engagement SLA</p><div className="mt-2"><SlaBadge state={ticket.slaState} dueAt={ticket.slaDueAt} /></div></div>
    <dl className="mt-6 divide-y divide-[var(--kit-border)] rounded-xl border border-[var(--kit-border)] px-4">
      <div className="flex items-center gap-3 py-4"><UserRound className="size-4 text-[var(--kit-text-2)]" /><dt className="text-xs text-[var(--kit-text-2)]">Demandeur</dt><dd className="ml-auto text-right text-sm font-semibold text-[var(--kit-text)]">{ticket.requester.name}</dd></div>
      <div className="flex items-center gap-3 py-4"><Building2 className="size-4 text-[var(--kit-text-2)]" /><dt className="text-xs text-[var(--kit-text-2)]">File</dt><dd className="ml-auto text-right text-sm font-semibold text-[var(--kit-text)]">{ticket.queue.name}</dd></div>
      <div className="flex items-center gap-3 py-4"><Clock3 className="size-4 text-[var(--kit-text-2)]" /><dt className="text-xs text-[var(--kit-text-2)]">Affectation</dt><dd className="ml-auto text-right text-sm font-semibold text-[var(--kit-text)]">{ticket.assignedTo?.name ?? "Non affecté"}</dd></div>
    </dl>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">{claimable ? <ClaimTicketButton ticketId={ticket.id} /> : null}<Link href={`/tickets/${ticket.id}` as Route} className="button-primary flex-1">Ouvrir le ticket <ArrowUpRight className="size-4" /></Link></div>
  </section>;
}
