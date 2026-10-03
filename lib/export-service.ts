import { AuthorizationError, hasPermission, requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/domain";
import { getReportingSummary } from "@/lib/reporting-service";
import { listVisibleTickets, type TicketListOptions } from "@/lib/ticket-query-service";

function csvCell(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function exportVisibleTickets(actor: UserContext, options: TicketListOptions = {}) {
  const current = await requireCurrentActor(actor);
  if (!hasPermission(current, "ticket:export")) {
    throw new AuthorizationError("L’export des tickets n’est pas autorisé pour votre rôle.");
  }
  const tickets = await listVisibleTickets(current, { ...options, take: Math.min(options.take ?? 100, 100) });
  const rows = tickets
    // Confidential records are never exported by this generic endpoint. A
    // dedicated, audited confidential export is intentionally not provided.
    .filter((ticket) => !ticket.confidential)
    .map((ticket) => [
      ticket.reference,
      ticket.title,
      STATUS_LABELS[ticket.status],
      ticket.priority,
      ticket.serviceCatalogItem.name,
      ticket.queue.department.name,
      ticket.queue.name,
      ticket.requester.name,
      ticket.assignedTo?.name ?? "",
      ticket.slaState,
      ticket.slaDueAt,
    ]);
  await prisma.auditLog.create({
    data: {
      actorId: current.id,
      action: "TICKET_EXPORT",
      objectType: "Export",
      objectId: current.id,
      newValue: { rowCount: rows.length, confidentialExcluded: true },
      reason: "Export des tickets autorisés demandé par l’utilisateur.",
    },
  });
  const header = ["Référence", "Titre", "Statut", "Priorité", "Service", "Département", "File", "Demandeur", "Agent", "État SLA", "Échéance SLA"];
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export async function exportReportingSummary(actor: UserContext) {
  const current = await requireCurrentActor(actor);
  if (!hasPermission(current, "reporting:export")) {
    throw new AuthorizationError("L’export du reporting n’est pas autorisé pour votre rôle.");
  }
  const summary = await getReportingSummary(current);
  const rows = [
    ["Indicateur", "Valeur"],
    ["Tickets analysés", summary.total],
    ["Tickets clôturés", summary.closed],
    ["Tickets annulés", summary.cancelled],
    ["Dénominateur de clôture (hors annulations)", summary.completionDenominator],
    ["SLA en dépassement", summary.overdue],
    ["Premières réponses dépassées", summary.firstResponseBreached],
    ["Résolutions dépassées", summary.resolutionBreached],
    ["Taux clôturé", `${summary.closureRate}%`],
    ...summary.byStatus.map((row) => [`Statut ${STATUS_LABELS[row.status]}`, row.count]),
  ];
  await prisma.auditLog.create({
    data: {
      actorId: current.id,
      action: "REPORTING_EXPORT",
      objectType: "Export",
      objectId: current.id,
      newValue: { total: summary.total, confidentialExcluded: true },
      reason: "Export des indicateurs autorisés demandé par l’utilisateur.",
    },
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
