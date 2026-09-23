import { SlaIndicator } from "@/components/sla-indicator";

export function TicketSlaPanel({ state, dueAt, createdAt, pausedMinutes }: { state: "NONE" | "OK" | "AT_RISK" | "BREACHED" | "PAUSED"; dueAt: Date | null; createdAt?: Date; pausedMinutes?: number }) {
  return <section className="ticket-sla-panel"><div><p className="eyebrow">SLA</p><h2>Engagement de service</h2></div><SlaIndicator state={state} dueAt={dueAt} startedAt={createdAt} pausedMinutes={pausedMinutes} /></section>;
}
