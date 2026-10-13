/**
 * Web Push presentation only. In-app and email notification content are left
 * untouched. Always build the destination from the authoritative ticket id.
 */
export type PushPresentationInput = {
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  ticket?: {
    id: string;
    reference: string;
    confidential: boolean;
    requesterName?: string | null;
  } | null;
};

const ticketHeadings: Record<string, string> = {
  QUEUE_NEW_TICKET: "Nouveau ticket",
  TICKET_ASSIGNED: "Ticket affecté",
  INFORMATION_REQUESTED: "Information demandée",
  TICKET_RESOLVED: "Ticket résolu",
  TICKET_REOPENED: "Ticket rouvert",
  TICKET_MESSAGE: "Nouveau message",
  TICKET_STATUS_CHANGED: "Statut modifié",
  SLA_ALERT: "Alerte SLA",
  SLA_BREACH: "Délai SLA dépassé",
  SLA_WARNING: "Alerte SLA",
  SLA_BREACHED: "Délai SLA dépassé",
  CONFIDENTIAL_ACCESS: "Accès au ticket",
  ADMINISTRATIVE_ACTION: "Ticket mis à jour",
};

function compact(value: string, maxLength: number) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

export function formatPushPresentation(input: PushPresentationInput) {
  // Asset/security and non-ticket events keep their existing content and route.
  if (!input.ticket) {
    return {
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? "/notifications",
    };
  }

  const actionUrl = `/tickets/${encodeURIComponent(input.ticket.id)}`;

  // Push notifications may appear on the lock screen. Never expose
  // the requester, the reference or any ticket details if confidential.
  if (input.ticket.confidential) {
    return {
      title: "1TASK · Ticket confidentiel",
      body: "Une demande vous attend.",
      actionUrl,
    };
  }

  const heading = ticketHeadings[input.type] ?? compact(input.title, 36) || "Ticket";
  const reference = compact(input.ticket.reference, 44);
  const requesterName = compact(input.ticket.requesterName ?? "", 55);

  return {
    title: `1TASK · ${heading}`,
    body: requesterName
      ? `${reference} · Demandeur : ${requesterName}`
      : `${reference} · À consulter`,
    actionUrl,
  };
}
