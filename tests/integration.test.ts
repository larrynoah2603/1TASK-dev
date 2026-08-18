import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);

describe.skipIf(!runDatabaseTests)("intégration PostgreSQL", () => {
  it("répond sur la base et expose les tables relationnelles", async () => {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    expect(result[0]?.ok).toBe(1);
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Ticket', 'TicketMessage', 'TicketAssignment', 'TicketEvent', 'AuditLog')`;
    expect(tables.map((table) => table.table_name)).toEqual(expect.arrayContaining(["Ticket", "TicketMessage", "TicketAssignment", "TicketEvent", "AuditLog"]));
  });

  it("expose les colonnes de provenance Entra et la configuration administrateur", async () => {
    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'User' AND column_name IN ('entraDisplayName', 'managedDisplayName', 'entraDepartmentValue', 'entraDepartmentNormalizedValue', 'departmentId', 'managerId', 'entraManagerId', 'primaryTeamId', 'authorizedQueueId', 'administrativelyDisabled'))
          OR (table_name = 'UserProfileChange' AND column_name IN ('userId', 'field', 'oldValue', 'newValue', 'reason'))
          OR (table_name = 'Ticket' AND column_name = 'sourceDepartmentId'))
    `;
    expect(columns).toEqual(expect.arrayContaining([
      { table_name: "User", column_name: "entraDepartmentValue" },
      { table_name: "User", column_name: "entraDepartmentNormalizedValue" },
      { table_name: "User", column_name: "administrativelyDisabled" },
      { table_name: "User", column_name: "entraDisplayName" },
      { table_name: "User", column_name: "managedDisplayName" },
      { table_name: "User", column_name: "managerId" },
      { table_name: "User", column_name: "entraManagerId" },
      { table_name: "User", column_name: "primaryTeamId" },
      { table_name: "User", column_name: "authorizedQueueId" },
      { table_name: "UserProfileChange", column_name: "oldValue" },
      { table_name: "UserProfileChange", column_name: "newValue" },
      { table_name: "Ticket", column_name: "sourceDepartmentId" },
    ]));
  });

  it("protège les tickets et les historiques contre les suppressions ou mises à jour directes", async () => {
    const triggers = await prisma.$queryRaw<Array<{ relname: string; tgname: string }>>`
      SELECT c.relname, t.tgname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal
        AND n.nspname = 'public'
        AND c.relname IN ('Ticket', 'AuditLog', 'TicketEvent', 'TicketAssignment', 'UserProfileChange')
    `;
    expect(triggers).toEqual(expect.arrayContaining([
      { relname: "Ticket", tgname: "ticket_immutable_delete" },
      { relname: "AuditLog", tgname: "audit_log_append_only" },
      { relname: "TicketEvent", tgname: "ticket_event_append_only" },
      { relname: "TicketAssignment", tgname: "ticket_assignment_append_only" },
      { relname: "UserProfileChange", tgname: "user_profile_change_append_only" },
    ]));
  });
});

afterAll(async () => {
  if (runDatabaseTests) await prisma.$disconnect();
});
