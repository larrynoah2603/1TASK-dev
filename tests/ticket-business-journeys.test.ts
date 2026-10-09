import {
  Impact,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Priority,
  RoleCode,
  ScopeType,
  SlaCalculationMode,
  TicketStatus,
  TicketType,
  Urgency,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { canClaimTicket } from "@/lib/access-control";
import { isEmailAllowedForDomain, isSignInAccountAllowed, isSupportedAuthProvider } from "@/lib/auth-policy";
import { calculatePriorityFromImpactUrgency, canTransitionStatus } from "@/lib/domain";
import { createInAppNotification } from "@/lib/notifications";
import { chooseAutoAssignmentCandidate, routeTicketFromCatalog } from "@/lib/routing";
import { calculateSlaDeadlines, getTicketSlaState } from "@/lib/sla";

describe("parcours métier ticket de bout en bout", () => {
  it("enchaîne login, création catalogue, priorité, SLA, affectation et workflow", () => {
    // Login Entra accepté.
    expect(isSupportedAuthProvider("microsoft-entra-id")).toBe(true);
    expect(isEmailAllowedForDomain("requester@bios-expertise.com", "bios-expertise.com")).toBe(true);
    expect(isSignInAccountAllowed({ status: "ACTIVE", administrativelyDisabled: false })).toBe(true);

    // Création et routage vers la file du service explicitement choisi.
    const routing = routeTicketFromCatalog({
      serviceCatalogItemId: "wifi",
      candidates: [{
        id: "wifi", code: "WIFI", name: "Wi-Fi", ticketType: TicketType.INCIDENT,
        category: "Réseau", queueId: "queue-network", priorityDefault: Priority.MEDIUM,
        keywords: ["wifi"],
      }],
    });
    expect(routing).toMatchObject({ queueId: "queue-network", type: TicketType.INCIDENT });
    expect(calculatePriorityFromImpactUrgency(Impact.HIGH, Urgency.CRITICAL)).toBe(Priority.CRITICAL);

    // SLA absolu calculé dès la création.
    const createdAt = new Date("2026-09-18T08:00:00.000Z");
    const deadlines = calculateSlaDeadlines(
      createdAt,
      { firstResponseMinutes: 60, resolutionMinutes: 240, calculationMode: SlaCalculationMode.ABSOLUTE },
      { workingDays: [1, 2, 3, 4, 5], workdayStartMinute: 480, workdayEndMinute: 1080, holidays: [] },
    );
    expect(deadlines.firstResponseDueAt.toISOString()).toBe("2026-09-18T09:00:00.000Z");

    // Auto-affectation à l’agent actif, compétent et le moins chargé.
    const assignee = chooseAutoAssignmentCandidate([
      { userId: "agent-b", isActive: true, isAvailable: true, skills: ["wifi"], openTicketCount: 4 },
      { userId: "agent-a", isActive: true, isAvailable: true, skills: ["wifi"], openTicketCount: 1 },
    ], ["wifi"], createdAt);
    expect(assignee?.userId).toBe("agent-a");

    // Workflow normal : affecté -> en cours -> résolution proposée -> clôture demandeur.
    expect(canTransitionStatus(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, [RoleCode.AGENT])).toBe(true);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.RESOLUTION_PENDING, [RoleCode.AGENT])).toBe(true);
    expect(canTransitionStatus(TicketStatus.RESOLUTION_PENDING, TicketStatus.CLOSED, [RoleCode.REQUESTER], true)).toBe(true);
    expect(getTicketSlaState({
      status: TicketStatus.IN_PROGRESS,
      firstResponseDueAt: deadlines.firstResponseDueAt,
      resolutionDueAt: deadlines.resolutionDueAt,
      firstRespondedAt: null,
      resolvedAt: null,
      slaPausedAt: null,
    }, new Date("2026-09-18T08:15:00.000Z")).state).toBe("AT_RISK");
  });

  it("refuse le login suspendu et la prise en charge hors équipe", () => {
    expect(isSignInAccountAllowed({ status: "ACTIVE", administrativelyDisabled: true })).toBe(false);
    const ticket = {
      requesterId: "requester", assignedToId: null, queueId: "queue-network",
      departmentId: "department-it", confidential: false, teamIds: ["team-network"],
    };
    const outsideAgent = {
      id: "agent-outside",
      teamIds: ["team-other"],
      roles: [{ code: RoleCode.AGENT, scope: { type: ScopeType.TEAM, teamId: "team-other" } }],
    };
    expect(canClaimTicket(outsideAgent, ticket)).toBe(false);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED, [RoleCode.AGENT])).toBe(false);
  });

  it("notifie l’agent affecté sans contourner ses préférences", async () => {
    vi.stubEnv("WEB_PUSH_PUBLIC_KEY", "test-value-a");
    vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "test-value-b");
    vi.stubEnv("WEB_PUSH_SUBJECT", "mailto:test@example.com");
    const findUnique = vi.fn().mockResolvedValue({ enabled: true });
    const findMany = vi.fn().mockResolvedValue([]);
    const create = vi.fn()
      .mockResolvedValueOnce({ id: "notification-1", channel: NotificationChannel.IN_APP })
      .mockResolvedValueOnce({ id: "push-1", channel: NotificationChannel.PUSH });
    const upsert = vi.fn().mockResolvedValue({ id: "outbox-1" });
    const notification = await createInAppNotification({
      notificationPreference: { findUnique, findMany },
      notification: { create },
      outboxEvent: { upsert },
    } as never, {
      recipientId: "agent-a",
      ticketId: "ticket-1",
      type: NotificationType.TICKET_ASSIGNED,
      title: "Nouveau ticket affecté",
      body: "Le ticket T-0001 vous a été affecté.",
    });

    expect(notification).toEqual({ id: "notification-1", channel: NotificationChannel.IN_APP });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_eventType_channel: {
          userId: "agent-a",
          eventType: NotificationType.TICKET_ASSIGNED,
          channel: NotificationChannel.IN_APP,
        },
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientId: "agent-a",
        ticketId: "ticket-1",
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
      }),
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientId: "agent-a",
        ticketId: "ticket-1",
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
      }),
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      type: "NOTIFICATION_PUSH_REQUESTED",
    }));
  });
});
