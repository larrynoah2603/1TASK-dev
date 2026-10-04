import { RoleCode, TicketStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  allowedNextStatuses,
  canTransitionStatus,
  isClaimableStatus,
  STATUS_LABELS,
} from "@/lib/domain";
import { ROLE_PERMISSION_CODES } from "@/lib/identity";
import { getTicketSlaState } from "@/lib/sla";
import { transitionTicketSchema } from "@/lib/validation";

const reason = "Demande créée par erreur et sans objet valable.";

describe("annulation terminale d’un ticket", () => {
  it.each([TicketStatus.NEW, TicketStatus.TO_QUALIFY, TicketStatus.TO_ASSIGN])(
    "autorise un agent à annuler depuis %s",
    (status) =>
      expect(
        canTransitionStatus(status, TicketStatus.CANCELLED, [RoleCode.AGENT]),
      ).toBe(true),
  );

  it.each([
    TicketStatus.ASSIGNED,
    TicketStatus.IN_PROGRESS,
    TicketStatus.BLOCKED,
    TicketStatus.RESOLUTION_PENDING,
    TicketStatus.REOPENED,
    TicketStatus.CLOSED,
    TicketStatus.CANCELLED,
  ])("refuse l’annulation depuis %s", (status) => {
    expect(
      canTransitionStatus(status, TicketStatus.CANCELLED, [RoleCode.AGENT]),
    ).toBe(false);
  });

  it("ne donne aucun droit de sortie au statut annulé", () => {
    expect(
      allowedNextStatuses(TicketStatus.CANCELLED, [RoleCode.AGENT]),
    ).toEqual([]);
    expect(isClaimableStatus(TicketStatus.CANCELLED)).toBe(false);
  });

  it("exige un motif significatif", () => {
    expect(
      transitionTicketSchema.safeParse({ status: TicketStatus.CANCELLED })
        .success,
    ).toBe(false);
    expect(
      transitionTicketSchema.safeParse({
        status: TicketStatus.CANCELLED,
        reason: "court",
      }).success,
    ).toBe(false);
    expect(
      transitionTicketSchema.safeParse({
        status: TicketStatus.CANCELLED,
        reason,
      }).success,
    ).toBe(true);
  });

  it("réserve la capacité aux rôles opérationnels et exclut le demandeur", () => {
    expect(ROLE_PERMISSION_CODES[RoleCode.REQUESTER]).not.toContain(
      "ticket:cancel",
    );
    expect(ROLE_PERMISSION_CODES[RoleCode.AGENT]).toContain("ticket:cancel");
    expect(ROLE_PERMISSION_CODES[RoleCode.QUEUE_MANAGER]).toContain(
      "ticket:cancel",
    );
    expect(ROLE_PERMISSION_CODES[RoleCode.FUNCTIONAL_ADMIN]).toContain(
      "ticket:cancel",
    );
    expect(
      canTransitionStatus(
        TicketStatus.NEW,
        TicketStatus.CANCELLED,
        [RoleCode.REQUESTER],
        true,
      ),
    ).toBe(false);
  });

  it("sort les tickets annulés du suivi SLA tout en conservant un libellé historique", () => {
    expect(
      getTicketSlaState(
        {
          status: TicketStatus.CANCELLED,
          firstResponseDueAt: new Date("2026-10-03T08:00:00Z"),
          resolutionDueAt: new Date("2026-10-03T09:00:00Z"),
          firstRespondedAt: null,
          resolvedAt: null,
          slaPausedAt: null,
        },
        new Date("2026-10-03T10:00:00Z"),
      ),
    ).toEqual({ state: "NONE", dueAt: null });
    expect(STATUS_LABELS[TicketStatus.CANCELLED]).toBe("Annulé");
  });
});
