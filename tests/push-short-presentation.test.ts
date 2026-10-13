import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { formatPushPresentation } from "@/lib/push-notification-presentation";

const source = (path: string) => readFileSync(path, "utf8");

const ticket = {
  id: "clp123abc",
  reference: "TCK-20261013-001",
  requesterName: "Marie Dupont",
  confidential: false,
};

describe("Web Push V1 — messages courts, demandeur et accès direct", () => {
  it("affiche la référence et le nom du demandeur dans un nouveau ticket normal", () => {
    expect(formatPushPresentation({
      type: "QUEUE_NEW_TICKET",
      title: "Nouveau ticket dans votre file",
      body: "Message interne détaillé conservé",
      actionUrl: "/notifications",
      ticket,
    })).toEqual({
      title: "1TASK · Nouveau ticket",
      body: "TCK-20261013-001 · Demandeur : Marie Dupont",
      actionUrl: "/tickets/clp123abc",
    });
  });

  it("reste court lors de l'affectation ou d'une alerte SLA", () => {
    const assigned = formatPushPresentation({ type: "TICKET_ASSIGNED", title: "Ticket affecté", body: "", ticket });
    const overdue = formatPushPresentation({ type: "SLA_BREACHED", title: "SLA", body: "", ticket });
    expect(assigned.title).toBe("1TASK · Ticket affecté");
    expect(overdue.title).toBe("1TASK · Délai SLA dépassé");
    expect(overdue.body).toContain("Marie Dupont");
    expect(overdue.actionUrl).toBe("/tickets/clp123abc");
  });

  it("cache strictement l'identité du demandeur pour un ticket confidentiel", () => {
    const payload = formatPushPresentation({
      type: "QUEUE_NEW_TICKET",
      title: "Titre secret",
      body: "Un message très sensible",
      ticket: { ...ticket, confidential: true },
    });
    expect(payload).toEqual({
      title: "1TASK · Ticket confidentiel",
      body: "Une demande vous attend.",
      actionUrl: "/tickets/clp123abc",
    });
    expect(JSON.stringify(payload)).not.toContain("Marie Dupont");
    expect(JSON.stringify(payload)).not.toContain("TCK-20261013-001");
    expect(JSON.stringify(payload)).not.toContain("sensible");
  });

  it("réduit les noms trop longs sans introduire de retours à la ligne", () => {
    const payload = formatPushPresentation({
      type: "TICKET_MESSAGE", title: "Message", body: "",
      ticket: { ...ticket, requesterName: "  Marie   Dupont\nServices  " + "X".repeat(90) },
    });
    expect(payload.body).not.toContain("\n");
    expect(payload.body.length).toBeLessThan(100);
    expect(payload.body).toContain("Marie Dupont");
  });

  it("préserve les événements sans ticket et leur URL existante", () => {
    expect(formatPushPresentation({
      type: "SECURITY", title: "Alerte sécurité", body: "Vérifiez votre compte",
      actionUrl: "/profile",
    })).toEqual({
      title: "Alerte sécurité",
      body: "Vérifiez votre compte",
      actionUrl: "/profile",
    });
  });

  it("conserve les protections V1 : droits, outbox et navigation directe", () => {
    const service = source("lib/push-notification-service.ts");
    const guard = source("lib/notification-authorization.ts");
    const worker = source("public/push-sw.js");
    expect(service).toContain("notificationMayBeDelivered(notificationId)");
    expect(service).toContain("formatPushPresentation({");
    expect(service).toContain("presentation.actionUrl");
    expect(service).toContain("recipient: { select: { pushSubscriptions: true } }");
    expect(service).toContain("requester: { select: { managedDisplayName: true, name: true, image: true } }");
    expect(guard).toContain("delegationId: null");
    expect(worker).toContain("client.navigate(targetUrl)");
    expect(worker).toContain("requestedUrl.origin === self.location.origin");
    expect(source("lib/notifications.ts")).toContain('type: "NOTIFICATION_PUSH_REQUESTED"');
  });
});
