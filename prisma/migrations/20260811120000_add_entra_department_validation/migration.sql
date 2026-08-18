-- Add an explicit provisioning state for Entra accounts whose department
-- value has not yet been mapped to an internal department.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_VALIDATION';

-- Preserve the authoritative value received from Microsoft Entra ID. The
-- application never accepts this value from a client-side form.
ALTER TABLE "User"
ADD COLUMN "entraDepartmentValue" VARCHAR(320);

ALTER TABLE "User"
ADD COLUMN "entraDepartmentNormalizedValue" VARCHAR(320);

CREATE TABLE "EntraDepartmentMapping" (
    "id" TEXT NOT NULL,
    "externalValue" VARCHAR(320) NOT NULL,
    "normalizedValue" VARCHAR(320) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntraDepartmentMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EntraDepartmentMapping_normalizedValue_key"
ON "EntraDepartmentMapping"("normalizedValue");

CREATE INDEX "EntraDepartmentMapping_externalValue_idx"
ON "EntraDepartmentMapping"("externalValue");

CREATE INDEX "EntraDepartmentMapping_departmentId_isActive_idx"
ON "EntraDepartmentMapping"("departmentId", "isActive");

CREATE INDEX "User_status_entraDepartmentValue_idx"
ON "User"("status", "entraDepartmentValue");

CREATE INDEX "User_status_entraDepartmentNormalizedValue_idx"
ON "User"("status", "entraDepartmentNormalizedValue");

ALTER TABLE "EntraDepartmentMapping"
ADD CONSTRAINT "EntraDepartmentMapping_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep the permission catalog usable for databases that are upgraded without
-- running the seed command again. The IDs are stable text identifiers and the
-- code remains the unique business key.
INSERT INTO "Permission" ("id", "code", "description") VALUES
  ('permission-ticket-claim', 'ticket:claim', 'Prendre en charge un ticket de sa file'),
  ('permission-ticket-transfer', 'ticket:transfer', 'Transférer un ticket vers une file autorisée'),
  ('permission-ticket-confidential-access', 'ticket:confidential-access', 'Accorder un accès nominatif à un ticket confidentiel'),
  ('permission-role-manage', 'role:manage', 'Administrer les rôles et les droits'),
  ('permission-entra-department-manage', 'entra-department:manage', 'Gérer les correspondances Entra-département'),
  ('permission-user-validate', 'user:validate', 'Valider le provisioning d’un utilisateur'),
  ('permission-sla-manage', 'sla:manage', 'Administrer les SLA et calendriers'),
  ('permission-technical-manage', 'technical:manage', 'Gérer la configuration technique autorisée')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN (
  'ticket:claim',
  'ticket:transfer',
  'ticket:confidential-access',
  'role:manage',
  'entra-department:manage',
  'user:validate',
  'sla:manage',
  'technical:manage'
)
WHERE r."code" = 'FUNCTIONAL_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN ('ticket:claim')
WHERE r."code" = 'AGENT'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN ('ticket:transfer', 'ticket:confidential-access', 'reporting:read')
WHERE r."code" = 'QUEUE_MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" = 'technical:manage'
WHERE r."code" = 'TECHNICAL_ADMIN'
ON CONFLICT DO NOTHING;

DELETE FROM "RolePermission" rp
USING "Role" r, "Permission" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."code" = 'REPORTING_READER'
  AND p."code" = 'ticket:read';

-- Remove the old broad technical-administrator grant if the database was
-- seeded before the role split was tightened.
DELETE FROM "RolePermission" rp
USING "Role" r, "Permission" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."code" = 'TECHNICAL_ADMIN'
  AND p."code" = 'organization:manage';

-- Tickets are historical records. The application has no hard-delete path,
-- and PostgreSQL also rejects direct deletion attempts.
CREATE OR REPLACE FUNCTION prevent_ticket_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Ticket deletion is forbidden; preserve the historical record';
END;
$$;

CREATE TRIGGER ticket_immutable_delete
BEFORE DELETE ON "Ticket"
FOR EACH ROW EXECUTE FUNCTION prevent_ticket_delete();
