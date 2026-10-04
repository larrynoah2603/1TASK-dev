import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateAutomaticClosureDeadline } from "@/lib/sla";

const apply = process.argv.includes("--apply");

async function main() {
  const tickets = await prisma.ticket.findMany({
    where: { status: TicketStatus.RESOLUTION_PENDING, autoClosureDueAt: null },
    select: {
      id: true,
      reference: true,
      resolvedAt: true,
      sla: { select: { isActive: true, calendar: { include: { holidays: true } } } },
    },
    orderBy: { id: "asc" },
  });
  const runAt = new Date();
  let repairable = 0;
  let updated = 0;
  const incomplete: Array<{ reference: string; reason: string }> = [];
  for (const ticket of tickets) {
    const calendar = ticket.sla?.calendar;
    if (!ticket.resolvedAt || !ticket.sla?.isActive || !calendar?.isActive) {
      incomplete.push({ reference: ticket.reference, reason: !ticket.resolvedAt ? "resolvedAt manquant" : "SLA ou calendrier inactif/manquant" });
      continue;
    }
    let deadline: Date;
    try {
      deadline = calculateAutomaticClosureDeadline(ticket.resolvedAt, {
        workingDays: calendar.workingDays,
        workdayStartMinute: calendar.workdayStartMinute,
        workdayEndMinute: calendar.workdayEndMinute,
        timezone: calendar.timezone,
        holidays: calendar.holidays.map((holiday) => holiday.date),
      });
    } catch {
      incomplete.push({ reference: ticket.reference, reason: "calendrier invalide" });
      continue;
    }
    if (deadline <= runAt) {
      incomplete.push({ reference: ticket.reference, reason: "échéance historique déjà dépassée — revue manuelle requise" });
      continue;
    }
    repairable += 1;
    if (apply) {
      updated += await prisma.$transaction(async (tx) => {
        const result = await tx.ticket.updateMany({
          where: { id: ticket.id, status: TicketStatus.RESOLUTION_PENDING, autoClosureDueAt: null, resolvedAt: ticket.resolvedAt },
          data: { autoClosureDueAt: deadline },
        });
        if (result.count) await tx.auditLog.create({ data: {
          actorId: null,
          action: "AUTO_CLOSURE_DEADLINE_BACKFILLED",
          objectType: "Ticket",
          objectId: ticket.id,
          newValue: { autoClosureDueAt: deadline, source: "resolvedAt" },
          reason: "Réparation idempotente de l’échéance de confirmation.",
        } });
        return result.count;
      });
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned: tickets.length, repairable, updated, incomplete }, null, 2));
}

main().finally(() => prisma.$disconnect());
